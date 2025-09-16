import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Mail, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  weddingDate?: string;
  stageEnteredAt?: string;
  createdAt: string;
}

interface ClientCardProps {
  client: Client;
  onMove: (stageId: string) => void;
}

export default function ClientCard({ client, onMove }: ClientCardProps) {
  const fullName = `${client.firstName} ${client.lastName}`;
  
  const getDaysInStage = () => {
    const enteredAt = client.stageEnteredAt ? new Date(client.stageEnteredAt) : new Date(client.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - enteredAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = () => {
    const days = getDaysInStage();
    if (days <= 2) return "bg-green-400";
    if (days <= 5) return "bg-yellow-400";
    return "bg-red-400";
  };

  const getStatusLabel = () => {
    const days = getDaysInStage();
    if (days <= 2) return "New";
    if (days <= 5) return "Active";
    return "Overdue";
  };

  const getStatusVariant = () => {
    const days = getDaysInStage();
    if (days <= 2) return "default";
    if (days <= 5) return "secondary";
    return "destructive";
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm" data-testid={`client-name-${client.id}`}>
            {fullName}
          </h4>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        </div>
        
        {client.weddingDate && (
          <p className="text-xs text-muted-foreground mb-2" data-testid={`client-wedding-date-${client.id}`}>
            {format(new Date(client.weddingDate), "MMMM d, yyyy")}
          </p>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground" data-testid={`client-days-in-stage-${client.id}`}>
            {getDaysInStage()} days in stage
          </span>
          <Badge variant={getStatusVariant()} className="text-xs">
            {getStatusLabel()}
          </Badge>
        </div>

        {/* Contact info */}
        {(client.email || client.phone) && (
          <div className="flex items-center space-x-2 mt-2">
            {client.email && (
              <Mail className="w-3 h-3 text-muted-foreground" />
            )}
            {client.phone && (
              <Phone className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`client-actions-${client.id}`}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Send Email</DropdownMenuItem>
              <DropdownMenuItem>Create Estimate</DropdownMenuItem>
              <DropdownMenuItem>Edit Client</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
