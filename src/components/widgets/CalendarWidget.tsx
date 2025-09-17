import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardData } from '@/hooks/useDashboard';

interface CalendarWidgetProps {
  data: DashboardData;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ data }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Events
        </CardTitle>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => navigate('/calendar')}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.upcomingEvents.length > 0 ? (
          data.upcomingEvents.slice(0, 3).map((event, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.time}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No upcoming events</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 h-6"
              onClick={() => navigate('/calendar')}
            >
              Add Event
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};