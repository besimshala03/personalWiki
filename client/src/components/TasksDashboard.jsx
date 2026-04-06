import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllTasks, getFolders, updateTask } from '../api';
import { todayKey, formatDueDate } from '../utils';

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(date) {
  const copy = startOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  return copy;
}

function daysRemaining(value) {
  const due = new Date(`${value}T00:00:00`);
  const today = new Date(`${todayKey()}T00:00:00`);
  const diff = Math.round((due - today) / 86400000);

  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

function sectionForTask(task) {
  const due = new Date(`${task.due_date}T00:00:00`);
  const today = new Date(`${todayKey()}T00:00:00`);
  const currentWeekEnd = endOfWeek(today);
  const nextWeekStart = new Date(currentWeekEnd);
  nextWeekStart.setDate(currentWeekEnd.getDate() + 1);
  const nextWeekEnd = endOfWeek(nextWeekStart);

  if (task.due_date < todayKey()) return 'overdue';
  if (due <= currentWeekEnd) return 'thisWeek';
  if (due <= nextWeekEnd) return 'nextWeek';
  return 'later';
}

function locationLabel(task, spacesById, foldersById) {
  const spaceName = spacesById.get(task.space)?.name ?? task.space;
  const folderName = task.folder_id ? foldersById.get(task.folder_id)?.name : null;
  return folderName ? `${spaceName} › ${folderName}` : `${spaceName} › Root`;
}

function TaskRow({ task, spacesById, foldersById, onToggle }) {
  const overdue = !task.completed && task.due_date < todayKey();

  return (
    <label className={`task-row ${overdue ? 'task-row--overdue' : ''} ${task.completed ? 'task-row--completed' : ''}`}>
      <input
        className="task-checkbox"
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
      />
      <div className="task-row-copy">
        <span className="task-row-title">{task.title}</span>
        <span className="task-row-location">{locationLabel(task, spacesById, foldersById)}</span>
      </div>
      <span className={`task-due ${overdue ? 'overdue' : ''}`}>{formatDueDate(task.due_date)}</span>
      <span className="task-row-remaining">{daysRemaining(task.due_date)}</span>
    </label>
  );
}

function Section({ title, tasks, spacesById, foldersById, onToggle }) {
  const [showCompleted, setShowCompleted] = useState(false);

  const groupedIncomplete = useMemo(() => {
    return tasks.incomplete.reduce((groups, task) => {
      const key = locationLabel(task, spacesById, foldersById);
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
      return groups;
    }, {});
  }, [tasks.incomplete, spacesById, foldersById]);

  return (
    <section className="task-section">
      <div className="task-section-header">
        <h2 className="task-section-title">{title}</h2>
        <span className="task-section-count">{tasks.incomplete.length} open</span>
      </div>

      {tasks.incomplete.length === 0 && tasks.completed.length === 0 ? (
        <p className="task-empty">No tasks in this section.</p>
      ) : (
        <>
          {Object.entries(groupedIncomplete).map(([group, groupTasks]) => (
            <div className="task-group" key={group}>
              <p className="task-group-title">{group}</p>
              <div className="task-list">
                {groupTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    spacesById={spacesById}
                    foldersById={foldersById}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          ))}

          {tasks.completed.length > 0 && (
            <div className="task-completed-group">
              <button className="task-completed-toggle" onClick={() => setShowCompleted(value => !value)}>
                {tasks.completed.length} done
              </button>
              {showCompleted && (
                <div className="task-list">
                  {tasks.completed.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      spacesById={spacesById}
                      foldersById={foldersById}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function TasksDashboard({ spaces, taskRefreshToken, onTasksChanged }) {
  const [tasks, setTasks] = useState([]);
  const [folders, setFolders] = useState([]);

  const load = useCallback(async () => {
    const [taskList, folderLists] = await Promise.all([
      getAllTasks(),
      Promise.all(spaces.map(space => getFolders(space.id))),
    ]);

    setTasks(taskList);
    setFolders(folderLists.flat());
  }, [spaces]);

  useEffect(() => {
    load();
  }, [load, taskRefreshToken]);

  const handleToggle = async (task) => {
    await updateTask(task.id, {
      completed: !task.completed,
      completed_at: task.completed ? null : new Date().toISOString(),
    });
    await load();
    onTasksChanged();
  };

  const spacesById = useMemo(() => new Map(spaces.map(space => [space.id, space])), [spaces]);
  const foldersById = useMemo(() => new Map(folders.map(folder => [folder.id, folder])), [folders]);

  const sections = useMemo(() => {
    const initial = {
      overdue: { incomplete: [], completed: [] },
      thisWeek: { incomplete: [], completed: [] },
      nextWeek: { incomplete: [], completed: [] },
      later: { incomplete: [], completed: [] },
    };

    for (const task of tasks) {
      const key = sectionForTask(task);
      initial[key][task.completed ? 'completed' : 'incomplete'].push(task);
    }

    return initial;
  }, [tasks]);

  const incompleteCount = tasks.filter(task => !task.completed).length;

  return (
    <div className="space-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Tasks</h1>
          <p className="view-count">{incompleteCount} open task{incompleteCount === 1 ? '' : 's'} in the wiki</p>
        </div>
      </div>

      <div className="view-accent" style={{ background: 'var(--accent)' }} />

      <div className="task-sections">
        <Section title="Overdue" tasks={sections.overdue} spacesById={spacesById} foldersById={foldersById} onToggle={handleToggle} />
        <Section title="This Week" tasks={sections.thisWeek} spacesById={spacesById} foldersById={foldersById} onToggle={handleToggle} />
        <Section title="Next Week" tasks={sections.nextWeek} spacesById={spacesById} foldersById={foldersById} onToggle={handleToggle} />
        <Section title="Later" tasks={sections.later} spacesById={spacesById} foldersById={foldersById} onToggle={handleToggle} />
      </div>
    </div>
  );
}
