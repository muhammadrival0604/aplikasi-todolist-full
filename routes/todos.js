const express = require("express");
const router = express.Router();
const Todo = require("../models/Todo");


router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});


const checkAndUpdateDueDate = async () => {
    try {
        const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
        const overdueTodos = await Todo.find({ dueDate: { $lt: today }, completed: false });

        if (overdueTodos.length > 0) {
            await Promise.all(overdueTodos.map(async (todo) => {
                todo.completed = true;
                await todo.save();
            }));
            console.log(`✅ ${overdueTodos.length} tugas diperbarui menjadi selesai.`);
        }
    } catch (error) {
        console.error("❌ Gagal memperbarui tugas yang overdue:", error);
    }
};


router.get("/", async (req, res) => {
    try {
        await checkAndUpdateDueDate();
        const todos = await Todo.find();
        res.json(todos);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data todo", error });
    }
});

router.post("/", async (req, res) => {
    try {
        const { title, priority, dueDate } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json({ message: "Judul todo tidak boleh kosong" });
        }

        const newTodo = new Todo({
            title: title.trim(),
            completed: false,
            subtasks: [],
            priority: priority || "Medium",
            dueDate: dueDate || null
        });

        await newTodo.save();
        res.status(201).json(newTodo);
    } catch (error) {
        res.status(500).json({ message: "Gagal menambahkan todo", error });
    }
});


router.put("/:id", async (req, res) => {
    try {
        const updatedTodo = await Todo.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!updatedTodo) {
            return res.status(404).json({ message: "Todo tidak ditemukan" });
        }

        res.json(updatedTodo);
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat memperbarui todo", error });
    }
});


router.delete("/:id", async (req, res) => {
    try {
        const deletedTodo = await Todo.findByIdAndDelete(req.params.id);
        if (!deletedTodo) return res.status(404).json({ message: "Todo tidak ditemukan" });

        res.json({ message: "Todo berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus todo", error });
    }
});


router.post("/:id/subtasks", async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || title.trim() === "") {
            return res.status(400).json({ message: "Judul subtask tidak boleh kosong" });
        }

        const updatedTodo = await Todo.findByIdAndUpdate(
            req.params.id,
            { $push: { subtasks: { title: title.trim(), completed: false } } },
            { new: true }
        );

        if (!updatedTodo) return res.status(404).json({ message: "Todo tidak ditemukan" });

        res.json(updatedTodo);
    } catch (error) {
        res.status(500).json({ message: "Gagal menambahkan subtask", error });
    }
});


router.put("/:todoId/subtasks/:subtaskId", async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.todoId);
        if (!todo) return res.status(404).json({ message: "Todo tidak ditemukan" });

        const subtask = todo.subtasks.id(req.params.subtaskId);
        if (!subtask) return res.status(404).json({ message: "Subtask tidak ditemukan" });

        subtask.completed = !subtask.completed;
        await todo.save();

        res.json(todo);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengubah status subtask", error });
    }
});


router.delete("/:todoId/subtasks/:subtaskId", async (req, res) => {
    try {
        const updatedTodo = await Todo.findByIdAndUpdate(
            req.params.todoId,
            { $pull: { subtasks: { _id: req.params.subtaskId } } },
            { new: true }
        );

        if (!updatedTodo) return res.status(404).json({ message: "Todo atau subtask tidak ditemukan" });

        res.json(updatedTodo);
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus subtask", error });
    }
});

module.exports = router;
