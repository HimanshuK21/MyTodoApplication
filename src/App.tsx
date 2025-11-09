import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  alarm?: Date | null;
};

function SortableItem({
  todo,
  editingId,
  startEdit,
  copyTodo,
  remove,
  toggle,
  setDragging,
}: {
  todo: Todo;
  editingId: string | null;
  startEdit: (id: string) => void;
  copyTodo: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  setDragging: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    zIndex: isDragging ? 999 : undefined,
  };

  // hide drag handle when editing
  const draggingClass = isDragging ? " dragging" : "";

  return (
    <li
      ref={setNodeRef}
      className={"todo-row" + draggingClass}
      style={style}
      data-completed={todo.completed}
      onMouseDown={() => setDragging(true)}
      onMouseUp={() => setDragging(false)}
    >
      <div className="left">
        <input
          id={`chk-${todo.id}`}
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggle(todo.id)}
          className="checkbox"
          aria-label={`Mark ${todo.text} completed`}
        />
      </div>

      <div className="center">
        {editingId === todo.id ? (
          // editing handled in parent
          <div className="display-row">
            <span className="text">{todo.text}</span>
            {todo.alarm ? <small className="alarm">⏰ {format(todo.alarm, "PPpp")}</small> : null}
          </div>
        ) : (
          <div className="display-row">
            <label htmlFor={`chk-${todo.id}`} className="todo-text">
              <span className="text">{todo.text}</span>
            </label>
            {todo.alarm ? <small className="alarm">⏰ {format(todo.alarm, "PPpp")}</small> : <small className="alarm muted">No alarm</small>}
          </div>
        )}
      </div>

      <div className="right">
        <button
          className="btn"
          onClick={() => startEdit(todo.id)}
          disabled={todo.completed}
          aria-disabled={todo.completed}
          title={todo.completed ? "Cannot edit a completed todo" : "Edit todo"}
        >
          Edit
        </button>

        <button className="btn" onClick={() => copyTodo(todo.id)} title="Copy todo">
          Copy
        </button>

        <button className="btn danger" onClick={() => remove(todo.id)}>
          Delete
        </button>

        {/* drag handle (accessible) */}
        <button
          {...attributes}
          {...listeners}
          className="btn drag-handle"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          ☰
        </button>
      </div>
    </li>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [alarm, setAlarm] = useState<Date | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

  // Editing state (in-place)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAlarm, setEditAlarm] = useState<Date | null>(null);

  // dragging flag for small UI tweaks
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function addTodo() {
    if (!text.trim()) return;
    setTodos((t) => [
      ...t,
      { id: Date.now().toString() + Math.random().toString(36).slice(2), text: text.trim(), completed: false, alarm: alarm || null },
    ]);
    setText("");
    setAlarm(null);
  }

  function toggle(id: string) {
    setTodos((t) => t.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it)));
  }

  function remove(id: string) {
    if (editingId === id) {
      setEditingId(null);
      setEditText("");
      setEditAlarm(null);
    }
    setTodos((t) => t.filter((it) => it.id !== id));
  }

  function copyTodo(id: string) {
    const item = todos.find((it) => it.id === id);
    if (!item) return;
    const copy: Todo = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      text: item.text + " (copy)",
      completed: false,
      alarm: item.alarm ? new Date(item.alarm) : null,
    };
    setTodos((list) => {
      const idx = list.findIndex((it) => it.id === id);
      const next = [...list];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  // In-place edit
  function startEdit(id: string) {
    const item = todos.find((it) => it.id === id);
    if (!item) return;
    if (item.completed) return;
    setEditingId(id);
    setEditText(item.text);
    setEditAlarm(item.alarm ?? null);
  }

  function saveEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setTodos((t) =>
      t.map((it) => (it.id === id ? { ...it, text: trimmed, alarm: editAlarm || null } : it))
    );
    setEditingId(null);
    setEditText("");
    setEditAlarm(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditAlarm(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = todos.findIndex((t) => t.id === String(active.id));
    const newIndex = todos.findIndex((t) => t.id === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    setTodos((items) => arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>My Todos — Drag & Drop Reorder</h1>
        <p className="muted">Drag the handle (☰) or use keyboard to reorder items.</p>
      </header>

      <section className="card form-card">
        <div className="form-row">
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Todo text"
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            aria-label="Todo text"
          />
          <DatePicker
            className="input datepicker"
            selected={alarm}
            onChange={(d) => setAlarm(d)}
            showTimeSelect
            timeIntervals={5}
            dateFormat="Pp"
            placeholderText="Set date & time"
            aria-label="Alarm date and time"
          />
          <button className="btn primary" onClick={addTodo} aria-label="Add todo">
            Add
          </button>
        </div>
      </section>

      <section className="card list-card" aria-live="polite">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={() => setIsDragging(true)} onDragCancel={() => setIsDragging(false)}>
          <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="todo-list" role="list">
              {todos.map((t) => (
                <React.Fragment key={t.id}>
                  {editingId === t.id ? (
                    <li className="todo-row editing" data-completed={t.completed}>
                      <div className="left">
                        <input id={`chk-${t.id}`} type="checkbox" checked={t.completed} onChange={() => toggle(t.id)} className="checkbox" />
                      </div>

                      <div className="center">
                        <div className="edit-row">
                          <input
                            className="input"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(t.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            aria-label="Edit todo text"
                            autoFocus
                          />
                          <DatePicker
                            className="input datepicker"
                            selected={editAlarm}
                            onChange={(d) => setEditAlarm(d)}
                            showTimeSelect
                            timeIntervals={5}
                            dateFormat="Pp"
                            placeholderText="Edit alarm"
                            aria-label="Edit alarm date and time"
                          />
                        </div>
                      </div>

                      <div className="right">
                        <button className="btn primary" onClick={() => saveEdit(t.id)}>
                          Save
                        </button>
                        <button className="btn" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </li>
                  ) : (
                    <SortableItem
                      todo={t}
                      editingId={editingId}
                      startEdit={startEdit}
                      copyTodo={copyTodo}
                      remove={remove}
                      toggle={toggle}
                      setDragging={setIsDragging}
                    />
                  )}
                </React.Fragment>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}