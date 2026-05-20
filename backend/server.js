const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5000;
const tasksFilePath = path.join(__dirname, "data", "tasks.json");
const validPriorities = ["Low", "Medium", "High"];
const validStatuses = ["To Do", "In Progress", "Done"];

app.use(cors());
app.use(express.json());

function normalizeTask(task) {
  const completed = typeof task.completed === "boolean"
    ? task.completed
    : task.status === "Done";

  const status = validStatuses.includes(task.status)
    ? task.status
    : completed
      ? "Done"
      : "To Do";

  return {
    id: task.id || crypto.randomUUID(),
    title: typeof task.title === "string" ? task.title : "",
    description: typeof task.description === "string" ? task.description : "",
    priority: validPriorities.includes(task.priority) ? task.priority : "Medium",
    dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
    status,
    completed: status === "Done"
  };
}

function readTasks() {
  try {
    const data = fs.readFileSync(tasksFilePath, "utf-8");
    const tasks = JSON.parse(data);
    return Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
  } catch (error) {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
}

function validateTaskInput(input, isUpdate = false) {
  const errors = [];

  if (!isUpdate || Object.prototype.hasOwnProperty.call(input, "title")) {
    if (!input.title || !String(input.title).trim()) {
      errors.push("Task title is required.");
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "description") && typeof input.description !== "string") {
    errors.push("Description must be text.");
  }

  if (Object.prototype.hasOwnProperty.call(input, "priority") && !validPriorities.includes(input.priority)) {
    errors.push("Priority must be Low, Medium, or High.");
  }

  if (Object.prototype.hasOwnProperty.call(input, "status") && !validStatuses.includes(input.status)) {
    errors.push("Status must be To Do, In Progress, or Done.");
  }

  if (Object.prototype.hasOwnProperty.call(input, "dueDate") && input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
    errors.push("Due date must be a valid date.");
  }

  return errors;
}

app.get("/tasks", (req, res) => {
  const tasks = readTasks();
  writeTasks(tasks);
  res.json(tasks);
});

app.post("/tasks", (req, res) => {
  const { title, description = "", priority = "Medium", status = "To Do", dueDate = "" } = req.body;
  const errors = validateTaskInput({ title, description, priority, status, dueDate });

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(" ") });
  }

  const tasks = readTasks();
  const newTask = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    priority,
    dueDate,
    createdAt: new Date().toISOString(),
    status,
    completed: status === "Done"
  };

  tasks.push(newTask);
  writeTasks(tasks);

  res.status(201).json(newTask);
});

app.put("/tasks/:id", (req, res) => {
  const tasks = readTasks();
  const taskIndex = tasks.findIndex((task) => task.id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ message: "Task not found." });
  }

  const updatedFields = {
    ...req.body
  };

  if (Object.prototype.hasOwnProperty.call(updatedFields, "title")) {
    updatedFields.title = String(updatedFields.title).trim();
  }

  if (Object.prototype.hasOwnProperty.call(updatedFields, "description")) {
    updatedFields.description = String(updatedFields.description).trim();
  }

  const errors = validateTaskInput(updatedFields, true);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(" ") });
  }

  if (Object.prototype.hasOwnProperty.call(updatedFields, "completed")
    && !Object.prototype.hasOwnProperty.call(updatedFields, "status")) {
    updatedFields.status = updatedFields.completed ? "Done" : "To Do";
  }

  if (Object.prototype.hasOwnProperty.call(updatedFields, "status")) {
    updatedFields.completed = updatedFields.status === "Done";
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...updatedFields
  };

  writeTasks(tasks);
  res.json(tasks[taskIndex]);
});

app.delete("/tasks/:id", (req, res) => {
  const tasks = readTasks();
  const filteredTasks = tasks.filter((task) => task.id !== req.params.id);

  if (filteredTasks.length === tasks.length) {
    return res.status(404).json({ message: "Task not found." });
  }

  writeTasks(filteredTasks);
  res.json({ message: "Task deleted successfully." });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
