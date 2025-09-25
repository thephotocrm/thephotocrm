import { storage } from '../storage.js';
import { DailyAvailabilityTemplate, DailyAvailabilityBreak, DailyAvailabilityOverride, InsertAvailabilitySlot } from '../../shared/schema.js';
import { nanoid } from 'nanoid';

interface SlotGenerationOptions {
  photographerId: string;
  startDate: Date;
  endDate: Date;
  slotDurationMinutes?: number; // Default to 60 minutes
}

interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export class SlotGenerationService {
  
  /**
   * Generate availability slots for a photographer within a date range
   * Uses daily templates with breaks and date-specific overrides
   */
  async generateSlotsForDateRange(options: SlotGenerationOptions): Promise<void> {
    const { photographerId, startDate, endDate, slotDurationMinutes = 60 } = options;
    
    // Get photographer's daily templates
    const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);
    
    // Get any overrides in the date range
    const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
      photographerId,
      this.formatDate(startDate),
      this.formatDate(endDate)
    );
    
    // Convert overrides to a map for quick lookup
    const overrideMap = new Map<string, DailyAvailabilityOverride>();
    overrides.forEach(override => {
      overrideMap.set(override.date, override);
    });
    
    // Process each date in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      await this.generateSlotsForDate(
        photographerId,
        currentDate,
        templates,
        overrideMap,
        slotDurationMinutes
      );
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  /**
   * Generate slots for a specific date
   */
  private async generateSlotsForDate(
    photographerId: string,
    date: Date,
    templates: DailyAvailabilityTemplate[],
    overrideMap: Map<string, DailyAvailabilityOverride>,
    slotDurationMinutes: number
  ): Promise<void> {
    const dateString = this.formatDate(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if there's an override for this date
    const override = overrideMap.get(dateString);
    
    let availabilityConfig: {
      startTime?: string;
      endTime?: string;
      templateId?: string;
      breaks: { startTime: string; endTime: string; label?: string }[];
      reason?: string;
    };
    
    if (override) {
      // Use override configuration - null startTime/endTime means closed day
      if (!override.startTime || !override.endTime) {
        // Day is closed due to override
        return;
      }
      
      availabilityConfig = {
        startTime: override.startTime,
        endTime: override.endTime,
        breaks: (override.breaks as any) || [], // Parse JSON breaks array
        reason: override.reason || undefined
      };
    } else {
      // Find template for this day of week
      const template = templates.find(t => t.dayOfWeek === dayOfWeek);
      if (!template) {
        // No template for this day, skip
        return;
      }
      
      // Check if template is enabled
      if (!template.isEnabled || !template.startTime || !template.endTime) {
        return;
      }
      
      // Get breaks for this template
      const templateBreaks = await storage.getDailyAvailabilityBreaksByTemplate(template.id);
      
      availabilityConfig = {
        startTime: template.startTime,
        endTime: template.endTime,
        templateId: template.id,
        breaks: templateBreaks.map(b => ({
          startTime: b.startTime,
          endTime: b.endTime,
          label: b.label
        }))
      };
    }
    
    // Generate time slots
    const timeSlots = this.generateTimeSlots(
      availabilityConfig.startTime!,
      availabilityConfig.endTime!,
      availabilityConfig.breaks,
      slotDurationMinutes
    );
    
    // Convert time slots to availability slots and save to database
    const availabilitySlots: InsertAvailabilitySlot[] = timeSlots.map(slot => {
      const slotTitle = availabilityConfig.reason 
        ? `Available (${availabilityConfig.reason})`
        : 'Available for booking';
      
      return {
        id: nanoid(),
        photographerId,
        title: slotTitle,
        description: `${slot.startTime} - ${slot.endTime}`,
        startAt: this.combineDateTime(date, slot.startTime),
        endAt: this.combineDateTime(date, slot.endTime),
        isBooked: false,
        isRecurring: false,
        sourceTemplateId: availabilityConfig.templateId || null
      };
    });
    
    // Note: Slots are now generated on-demand, no persistence needed
    // The template-based system generates slots dynamically for API requests
  }
  
  /**
   * Generate time slots within a time range, excluding breaks
   */
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    breaks: { startTime: string; endTime: string; label?: string }[],
    slotDurationMinutes: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    // Parse start and end times to minutes since midnight
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    // Generate all possible slots
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotDurationMinutes) {
      const slotEndMinutes = currentMinutes + slotDurationMinutes;
      
      // Skip if slot would extend beyond availability
      if (slotEndMinutes > endMinutes) {
        break;
      }
      
      // Check if this slot conflicts with any breaks
      const hasConflict = breaks.some(breakTime => {
        const breakStartMinutes = this.timeToMinutes(breakTime.startTime);
        const breakEndMinutes = this.timeToMinutes(breakTime.endTime);
        
        // Check if slot overlaps with break
        return !(slotEndMinutes <= breakStartMinutes || currentMinutes >= breakEndMinutes);
      });
      
      // If no conflict, add the slot
      if (!hasConflict) {
        slots.push({
          startTime: this.minutesToTime(currentMinutes),
          endTime: this.minutesToTime(slotEndMinutes)
        });
      }
    }
    
    return slots;
  }
  
  // clearSlotsForDate method removed - slots are now generated on-demand without persistence
  
  /**
   * Regenerate slots for a specific template
   * Called when template or breaks are modified
   */
  async regenerateSlotsForTemplate(templateId: string, daysInFuture: number = 90): Promise<void> {
    const template = await storage.getDailyAvailabilityTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysInFuture);
    
    await this.generateSlotsForDateRange({
      photographerId: template.photographerId,
      startDate,
      endDate
    });
  }
  
  /**
   * Regenerate slots for a specific date (when override is modified)
   */
  async regenerateSlotsForDate(photographerId: string, date: Date): Promise<void> {
    const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);
    const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
      photographerId,
      this.formatDate(date),
      this.formatDate(date)
    );
    
    const overrideMap = new Map<string, DailyAvailabilityOverride>();
    overrides.forEach(override => {
      overrideMap.set(override.date, override);
    });
    
    await this.generateSlotsForDate(photographerId, date, templates, overrideMap, 60);
  }
  
  /**
   * Get generated time slots for a specific date (on-demand, no persistence)
   * Returns slots in API-friendly format for frontend display
   */
  async getSlotsForDate(photographerId: string, date: Date): Promise<any[]> {
    const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);
    const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
      photographerId,
      this.formatDate(date),
      this.formatDate(date)
    );
    
    const overrideMap = new Map<string, DailyAvailabilityOverride>();
    overrides.forEach(override => {
      overrideMap.set(override.date, override);
    });
    
    // Generate slots without persistence
    const dateString = this.formatDate(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if there's an override for this date
    const override = overrideMap.get(dateString);
    
    let availabilityConfig: {
      startTime?: string;
      endTime?: string;
      templateId?: string;
      breaks: { startTime: string; endTime: string; label?: string }[];
      reason?: string;
    };
    
    if (override) {
      // Use override configuration - null startTime/endTime means closed day
      if (!override.startTime || !override.endTime) {
        // Day is closed due to override
        return [];
      }
      
      availabilityConfig = {
        startTime: override.startTime,
        endTime: override.endTime,
        breaks: (override.breaks as any) || [], // Parse JSON breaks array
        reason: override.reason || undefined
      };
    } else {
      // Find template for this day of week
      const template = templates.find(t => t.dayOfWeek === dayOfWeek);
      if (!template) {
        // No template for this day, return empty
        return [];
      }
      
      // Check if template is enabled
      if (!template.isEnabled || !template.startTime || !template.endTime) {
        return [];
      }
      
      // Get breaks for this template
      const templateBreaks = await storage.getDailyAvailabilityBreaksByTemplate(template.id);
      
      availabilityConfig = {
        startTime: template.startTime,
        endTime: template.endTime,
        templateId: template.id,
        breaks: templateBreaks.map(b => ({
          startTime: b.startTime,
          endTime: b.endTime,
          label: b.label
        }))
      };
    }
    
    // Generate time slots
    const timeSlots = this.generateTimeSlots(
      availabilityConfig.startTime!,
      availabilityConfig.endTime!,
      availabilityConfig.breaks,
      60 // 1 hour duration
    );
    
    // Convert to API format (similar to AvailabilitySlot but lightweight)
    return timeSlots.map(slot => ({
      id: `slot-${slot.startTime}-${slot.endTime}`,
      date: dateString,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: true,
      photographerId
    }));
  }

  /**
   * Batch insert availability slots for better performance
   */
  private async batchInsertSlots(slots: InsertAvailabilitySlot[]): Promise<void> {
    // Insert all slots in a single bulk operation for optimal performance
    await storage.createAvailabilitySlotsBatch(slots);
  }

  // Utility methods
  
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

// Export singleton instance
export const slotGenerationService = new SlotGenerationService();