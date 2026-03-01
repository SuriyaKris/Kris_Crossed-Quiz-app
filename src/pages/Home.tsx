import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Play, Copy, Trash2, BarChart2 } from "lucide-react";

export default function Home() {
  const [quizzes, setQuizzes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/quizzes")
      .then((res) => res.json())
      .then(setQuizzes);
  }, []);

  const deleteQuiz = async (id: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
      setQuizzes(quizzes.filter((q: any) => q.id !== id));
    }
  };

  const duplicateQuiz = async (id: string) => {
    const quiz = await fetch(`/api/quizzes/${id}`).then((res) => res.json());
    const newQuiz = { ...quiz, title: `${quiz.title} (Copy)` };
    await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQuiz),
    });
    const updatedQuizzes = await fetch("/api/quizzes").then((res) => res.json());
    setQuizzes(updatedQuizzes);
  };

  const startQuiz = (id: string) => {
    // In a real app, we'd create a session and get a roomId
    // For now, we'll just navigate to the host view with the quiz ID
    navigate(`/host/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Kris_Crossed</h1>
          <div className="flex gap-4">
            <Link
              to="/results"
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <BarChart2 size={20} />
              Results
            </Link>
            <Link
              to="/editor"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
              Create Quiz
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz: any) => (
            <div key={quiz.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <h3 className="text-xl font-semibold text-slate-800 mb-2">{quiz.title}</h3>
              <p className="text-sm text-slate-500 mb-6">
                Created {new Date(quiz.created_at).toLocaleDateString()}
              </p>
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => startQuiz(quiz.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Play size={18} />
                  Host
                </button>
                <button
                  onClick={() => duplicateQuiz(quiz.id)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Duplicate"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={() => deleteQuiz(quiz.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No quizzes yet. Create one to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
