import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DelayTimingValue {
  delayDays: number;
  delayHours: number;
  delayMinutes: number;
  sendAtHour?: number;
  sendAtMinute?: number;
}

// Derive timing mode from data (not explicit state)
export function deriveTimingMode(value: DelayTimingValue): 'immediate' | 'delayed' {
  const isImmediate = value.delayDays === 0 && value.delayHours === 0 && value.delayMinutes === 0;
  return isImmediate ? 'immediate' : 'delayed';
}

interface DelayTimingEditorProps {
  value: DelayTimingValue;
  onChange: (value: DelayTimingValue) => void;
  allowImmediate?: boolean;
  disabled?: boolean;
}

// Safe parseInt that returns 0 for NaN
function safeParseInt(input: string): number {
  const parsed = parseInt(input);
  return isNaN(parsed) ? 0 : parsed;
}

export function DelayTimingEditor({ 
  value, 
  onChange, 
  allowImmediate = true,
  disabled = false 
}: DelayTimingEditorProps) {
  // Derive mode from data
  const timingMode = deriveTimingMode(value);
  
  const handleTimingModeChange = (mode: 'immediate' | 'delayed') => {
    if (mode === 'immediate') {
      onChange({
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 0,
        sendAtHour: undefined,
        sendAtMinute: undefined
      });
    } else {
      // Switch to delayed - set a non-zero default so UI renders
      const hasExistingDelay = value.delayDays > 0 || value.delayHours > 0 || value.delayMinutes > 0;
      onChange({
        ...value,
        delayMinutes: hasExistingDelay ? value.delayMinutes : 5, // Default 5 minutes if no existing delay
        delayHours: value.delayHours || 0,
        delayDays: value.delayDays || 0
      });
    }
  };

  const handleDelayDaysChange = (inputValue: string) => {
    const days = safeParseInt(inputValue);
    const wasDayBased = value.delayDays >= 1;
    const nowDayBased = days >= 1;
    
    if (!wasDayBased && nowDayBased) {
      // Transitioning from exact to day-based: clear exact delays, set time defaults only if not already set
      onChange({
        delayDays: days,
        delayHours: 0,
        delayMinutes: 0,
        sendAtHour: value.sendAtHour ?? 9, // Default 9 AM only if not already set
        sendAtMinute: value.sendAtMinute ?? 0
      });
    } else if (wasDayBased && !nowDayBased) {
      // Transitioning from day-based to exact: clear time-of-day fields
      onChange({
        delayDays: days,
        delayHours: value.delayHours || 0,
        delayMinutes: value.delayMinutes || 0,
        sendAtHour: undefined,
        sendAtMinute: undefined
      });
    } else {
      // Staying in same mode, just update days
      onChange({
        ...value,
        delayDays: days
      });
    }
  };

  return (
    <div className="space-y-3">
      {allowImmediate && (
        <>
          <Label>Send Timing {timingMode === 'delayed' && <span className="text-blue-600 dark:text-blue-400 font-semibold">(Delay Active)</span>}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={timingMode === 'immediate' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => handleTimingModeChange('immediate')}
              disabled={disabled}
              data-testid="button-timing-immediate"
            >
              Send Immediately
            </Button>
            <Button
              type="button"
              variant={timingMode === 'delayed' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => handleTimingModeChange('delayed')}
              disabled={disabled}
              data-testid="button-timing-delayed"
            >
              Send After Delay
            </Button>
          </div>
        </>
      )}

      {timingMode === 'delayed' && (
        <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
          {/* Days Input */}
          <div className="space-y-2">
            <Label className="text-xs">Delay (Days)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              disabled={disabled}
              data-testid="input-delay-days"
              value={value.delayDays}
              onChange={e => handleDelayDaysChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {value.delayDays >= 1 
                ? 'Sends on the next calendar day at a specific time'
                : 'Use hours/minutes for exact delays under 1 day'}
            </p>
          </div>

          {/* Conditional: Time Picker (when days >= 1) */}
          {value.delayDays >= 1 && (
            <div className="space-y-2">
              <Label className="text-xs">Send At (Time of Day)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Hour (0-23)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="9"
                    disabled={disabled}
                    data-testid="input-send-at-hour"
                    value={value.sendAtHour ?? 9}
                    onChange={e => onChange({ ...value, sendAtHour: safeParseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minute (0-59)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    disabled={disabled}
                    data-testid="input-send-at-minute"
                    value={value.sendAtMinute ?? 0}
                    onChange={e => onChange({ ...value, sendAtMinute: safeParseInt(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: "1 day @ 9:00 AM" sends the next day at 9:00 AM
              </p>
            </div>
          )}

          {/* Conditional: Hours/Minutes (when days = 0) */}
          {value.delayDays === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Exact delay time</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="0"
                    disabled={disabled}
                    data-testid="input-delay-hours"
                    value={value.delayHours}
                    onChange={e => onChange({ ...value, delayHours: safeParseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minutes</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    disabled={disabled}
                    data-testid="input-delay-minutes"
                    value={value.delayMinutes}
                    onChange={e => onChange({ ...value, delayMinutes: safeParseInt(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sends exactly this amount of time after the trigger
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
