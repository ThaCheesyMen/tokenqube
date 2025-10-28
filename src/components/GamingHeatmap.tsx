import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Flame, TrendingUp } from 'lucide-react';

interface ActivityData {
  date: string;
  hours: number;
  games: number;
  achievements: number;
}

interface GamingHeatmapProps {
  userId: string;
}

export default function GamingHeatmap({ userId }: GamingHeatmapProps) {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [hoveredDay, setHoveredDay] = useState<ActivityData | null>(null);
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    avgHours: 0
  });

  useEffect(() => {
    fetchActivityData();
  }, [userId]);

  const fetchActivityData = async () => {
    // Fetch last 365 days of activity
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);

    const { data, error } = await supabase
      .from('gaming_activity')
      .select('*')
      .eq('user_id', userId)
      .gte('activity_date', startDate.toISOString().split('T')[0])
      .lte('activity_date', endDate.toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (data && !error) {
      const formatted = data.map(d => ({
        date: d.activity_date,
        hours: parseFloat(d.total_hours),
        games: d.games_played,
        achievements: d.achievements_earned
      }));
      
      setActivityData(formatted);
      calculateStats(formatted);
    }
  };

  const calculateStats = (data: ActivityData[]) => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const activity of sortedData) {
      const currentDate = new Date(activity.date);
      
      if (lastDate) {
        const dayDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1 && activity.hours > 0) {
          tempStreak++;
        } else if (activity.hours > 0) {
          tempStreak = 1;
        } else {
          tempStreak = 0;
        }
      } else if (activity.hours > 0) {
        tempStreak = 1;
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = currentDate;
    }

    // Calculate current streak (from today backwards)
    const today = new Date();
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const activity = sortedData[i];
      const activityDate = new Date(activity.date);
      const dayDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === currentStreak && activity.hours > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    const totalHours = data.reduce((sum, d) => sum + d.hours, 0);
    const activeDays = data.filter(d => d.hours > 0).length;

    setStats({
      currentStreak,
      longestStreak,
      totalDays: activeDays,
      avgHours: activeDays > 0 ? totalHours / activeDays : 0
    });
  };

  const getColorIntensity = (hours: number): string => {
    if (hours === 0) return 'bg-[#1a1a1a]';
    if (hours < 1) return 'bg-[#8B5CF6]/20';
    if (hours < 2) return 'bg-[#8B5CF6]/40';
    if (hours < 4) return 'bg-[#8B5CF6]/60';
    if (hours < 6) return 'bg-[#8B5CF6]/80';
    return 'bg-[#8B5CF6]';
  };

  const generateCalendarData = () => {
    const weeks: (ActivityData | null)[][] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);

    // Create a map for quick lookup
    const dataMap = new Map(activityData.map(d => [d.date, d]));

    // Start from the first Sunday before startDate
    const firstDay = new Date(startDate);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    let currentDate = new Date(firstDay);
    let week: (ActivityData | null)[] = [];

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = dataMap.get(dateStr) || { date: dateStr, hours: 0, games: 0, achievements: 0 };
      
      week.push(activity);
      
      if (week.length === 7) {
        weeks.push([...week]);
        week = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (week.length > 0) {
      weeks.push(week);
    }

    return weeks;
  };

  const weeks = generateCalendarData();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-xl p-6 border border-[#202225]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Gaming Activity
          </h3>
          <p className="text-gray-400 text-sm mt-1">Your gaming journey over the past year</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-400 font-semibold">Current Streak</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.currentStreak} days</p>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-400 font-semibold">Longest Streak</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.longestStreak} days</p>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
          <span className="text-xs text-gray-400 font-semibold block mb-1">Active Days</span>
          <p className="text-2xl font-black text-white">{stats.totalDays}</p>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225]">
          <span className="text-xs text-gray-400 font-semibold block mb-1">Avg Hours/Day</span>
          <p className="text-2xl font-black text-white">{stats.avgHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-2 pl-12">
            {months.map((month, i) => (
              <div key={i} className="text-xs text-gray-400 font-semibold" style={{ width: `${100 / 12}%` }}>
                {month}
              </div>
            ))}
          </div>
          
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-2">
              {days.map((day, i) => i % 2 === 1 ? (
                <div key={i} className="h-3 text-xs text-gray-400 font-semibold flex items-center">
                  {day}
                </div>
              ) : (
                <div key={i} className="h-3"></div>
              ))}
            </div>

            {/* Activity grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${day ? getColorIntensity(day.hours) : 'bg-[#1a1a1a]'} 
                        hover:ring-2 hover:ring-[#8B5CF6] hover:ring-offset-1 hover:ring-offset-[#36393f] 
                        transition-all cursor-pointer`}
                      onMouseEnter={() => day && setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={day ? `${day.date}: ${day.hours}h` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-[#1a1a1a] rounded-sm"></div>
              <div className="w-3 h-3 bg-[#8B5CF6]/20 rounded-sm"></div>
              <div className="w-3 h-3 bg-[#8B5CF6]/40 rounded-sm"></div>
              <div className="w-3 h-3 bg-[#8B5CF6]/60 rounded-sm"></div>
              <div className="w-3 h-3 bg-[#8B5CF6]/80 rounded-sm"></div>
              <div className="w-3 h-3 bg-[#8B5CF6] rounded-sm"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredDay && (
        <div className="mt-4 bg-[#1a1a1a] rounded-lg p-4 border border-[#8B5CF6]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{new Date(hoveredDay.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="text-gray-400">{hoveredDay.hours.toFixed(1)} hours played</span>
                <span className="text-gray-400">{hoveredDay.games} games</span>
                <span className="text-gray-400">{hoveredDay.achievements} achievements</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

