import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCalendarPosts } from '@/hooks/useSocialMedia';
import { SocialPostEditor } from './SocialPostEditor';
import type { SocialPost } from '@/hooks/useSocialBooster';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  X,
  MessageCircle,
  CalendarDays,
} from 'lucide-react';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  x: X,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
};

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-400',
  scheduled: 'bg-purple-400',
  approved: 'bg-blue-400',
  draft: 'bg-gray-300',
  failed: 'bg-red-400',
  skipped: 'bg-gray-200',
};

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function SocialCalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  const { data: posts, isLoading } = useCalendarPosts(monthStr);

  // Group posts by day
  const postsByDay = useMemo(() => {
    const map: Record<number, typeof posts> = {};
    if (!posts) return map;

    for (const post of posts) {
      const dateStr = post.scheduled_for || post.published_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d.getMonth() !== monthIdx || d.getFullYear() !== year) continue;
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day]!.push(post);
    }
    return map;
  }, [posts, monthIdx, year]);

  // Calendar grid
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, monthIdx, 1).getDay() + 6) % 7; // Monday-based

  const prevMonth = () => {
    if (monthIdx === 0) { setYear(year - 1); setMonthIdx(11); }
    else setMonthIdx(monthIdx - 1);
  };

  const nextMonth = () => {
    if (monthIdx === 11) { setYear(year + 1); setMonthIdx(0); }
    else setMonthIdx(monthIdx + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonthIdx(today.getMonth());
  };

  const selectedDayPosts = selectedDay ? postsByDay[selectedDay] || [] : [];

  return (
    <div className="space-y-4">
      {/* Header: month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTHS_FR[monthIdx]} {year}
          </h3>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday} className="gap-1">
          <CalendarDays className="w-3 h-3" /> Aujourd'hui
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_FR.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] rounded-md bg-gray-50/50" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayPosts = postsByDay[day] || [];
                const isToday = day === today.getDate() && monthIdx === today.getMonth() && year === today.getFullYear();

                return (
                  <div
                    key={day}
                    className={`min-h-[80px] rounded-md border p-1 cursor-pointer transition-colors hover:bg-accent/50 ${
                      isToday ? 'border-primary bg-primary/5' : 'border-transparent'
                    } ${dayPosts.length > 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {day}
                      </span>
                      {dayPosts.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{dayPosts.length}</span>
                      )}
                    </div>
                    {/* Post indicators */}
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {dayPosts.slice(0, 6).map((post) => {
                        const statusColor = STATUS_COLORS[post.status] || 'bg-gray-300';
                        return (
                          <div
                            key={post.id}
                            className={`w-4 h-4 rounded-sm ${statusColor} flex items-center justify-center`}
                            title={`${post.platform} — ${post.status}`}
                          >
                            {(() => {
                              const Icon = PLATFORM_ICONS[post.platform];
                              return Icon ? <Icon className="w-2.5 h-2.5 text-white" /> : null;
                            })()}
                          </div>
                        );
                      })}
                      {dayPosts.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 6}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 px-1">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${color}`} />
                  <span className="text-[10px] text-muted-foreground capitalize">{
                    status === 'published' ? 'Publié' :
                    status === 'scheduled' ? 'Programmé' :
                    status === 'approved' ? 'Approuvé' :
                    status === 'draft' ? 'Brouillon' :
                    status === 'failed' ? 'Échec' : 'Ignoré'
                  }</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day detail sheet */}
      <Sheet open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDay} {MONTHS_FR[monthIdx]} {year}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {selectedDayPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun post ce jour.
              </p>
            ) : (
              selectedDayPosts.map((post) => (
                <SocialPostEditor key={post.id} post={post} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
