/**
 * TodaysFollowUpsWidget.tsx – Dashboard widget listing meetings & follow-ups due today.
 * Supports completing tasks, quick-adding follow-ups, and live status toggling.
 * 
 * FIX #20:
 *   - Removed fake mock-1 'Marcus Sterling' and mock-2 'Elena Rostova' injections completely.
 *   - Renders clean empty state with "+ Schedule Follow-Up" when no tasks exist.
 */
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
  CalendarCheck,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { TaskMeeting } from '../../types/crm';

interface Props {
  orgId: string | null;
  userId?: string;
  onNotify: (msg: string) => void;
}

export const TodaysFollowUpsWidget: React.FC<Props> = ({ orgId, userId, onNotify }) => {
  const [tasks, setTasks] = useState<TaskMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('14:00');
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    async function loadTasks() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks_meetings')
          .select(`
            id,
            org_id,
            lead_id,
            assigned_to,
            title,
            due_date,
            status,
            type,
            leads ( name, phone, email )
          `)
          .eq('org_id', orgId)
          .order('due_date', { ascending: true })
          .limit(10);

        if (error) throw error;

        if (data) {
          const mapped: TaskMeeting[] = data.map((t: any) => ({
            id: t.id,
            org_id: t.org_id,
            lead_id: t.lead_id,
            assigned_to: t.assigned_to,
            title: t.title,
            due_date: t.due_date,
            status: t.status,
            type: t.type || 'follow_up',
            lead_name: t.leads?.name,
            lead_phone: t.leads?.phone,
            lead_email: t.leads?.email,
          }));
          setTasks(mapped);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.warn('tasks_meetings fetch:', err);
        // Clean empty state — no fake mocks injected
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [orgId, userId]);

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus as any } : t))
    );

    if (orgId && !taskId.startsWith('mock-')) {
      await supabase
        .from('tasks_meetings')
        .update({ status: nextStatus })
        .eq('id', taskId)
        .eq('org_id', orgId);
    }

    onNotify(nextStatus === 'completed' ? 'Follow-up marked as completed ✓' : 'Task reopened');
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !orgId) return;

    setSavingTask(true);
    const today = new Date();
    const [hours, mins] = newTime.split(':').map(Number);
    today.setHours(hours || 12, mins || 0, 0, 0);

    const taskPayload = {
      org_id: orgId,
      title: newTitle.trim(),
      due_date: today.toISOString(),
      status: 'pending',
      assigned_to: userId || null,
      type: 'follow_up',
    };

    try {
      const { data, error } = await supabase
        .from('tasks_meetings')
        .insert(taskPayload)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTasks((prev) => [data as TaskMeeting, ...prev]);
      }
      onNotify(`Added today's follow-up: "${newTitle}"`);
      setNewTitle('');
      setIsAdding(false);
    } catch (err: any) {
      console.warn('Failed to insert task:', err.message);
      onNotify(`Could not save follow-up: ${err.message}`);
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col gap-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#99efe5]/50 text-[#006f67] flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-[17px] text-[#0b1c30]">
              Today's Follow-ups
            </h3>
            <span className="text-[11px] text-[#6e7a73]">
              {tasks.filter((t) => t.status === 'pending').length} tasks pending today
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-semibold text-[#005d42] hover:text-[#004d37] flex items-center gap-1 bg-[#eff4ff] hover:bg-[#e5eeff] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-[#f8fafc] border border-slate-200 p-3 rounded-xl flex flex-col gap-2">
          <input
            type="text"
            required
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Call client re: counter-offer"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/20"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingTask}
                className="bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingTask ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#005d42]" />
          Loading agenda…
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-8 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
          <Calendar className="w-6 h-6 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No follow-ups scheduled today</p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-1 text-xs font-semibold text-[#005d42] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Schedule Follow-Up
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const isDone = task.status === 'completed';
            const timeStr = task.due_date
              ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div
                key={task.id}
                className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                  isDone
                    ? 'bg-slate-50/60 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleComplete(task.id, task.status)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                    isDone
                      ? 'bg-[#005d42] border-[#005d42] text-white'
                      : 'border-slate-300 hover:border-[#005d42]'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-tight ${isDone ? 'line-through text-slate-400' : 'text-[#0b1c30]'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    {timeStr && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {timeStr}
                      </span>
                    )}
                    {task.lead_name && (
                      <span className="truncate max-w-[120px] font-medium text-[#005d42]">
                        • {task.lead_name}
                      </span>
                    )}
                  </div>
                </div>

                {task.lead_phone && !isDone && (
                  <a
                    href={`tel:${task.lead_phone}`}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-[#005d42] transition-colors"
                    title={`Call ${task.lead_phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
