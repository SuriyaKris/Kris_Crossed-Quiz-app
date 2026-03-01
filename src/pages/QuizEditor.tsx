import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Save, Wand2, ArrowLeft, Image as ImageIcon, X } from "lucide-react";

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Untitled Quiz");
  const [showImageInputs, setShowImageInputs] = useState<Record<string, boolean>>({});
  const [questions, setQuestions] = useState([
    {
      text: "",
      image_url: "",
      time_limit: 30,
      options: [
        { text: "", image_url: "", is_correct: true },
        { text: "", image_url: "", is_correct: false },
        { text: "", image_url: "", is_correct: false },
        { text: "", image_url: "", is_correct: false },
      ],
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => {
    if (id) {
      fetch(`/api/quizzes/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setTitle(data.title);
          setQuestions(data.questions);
        });
    }
  }, [id]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "",
        image_url: "",
        time_limit: 30,
        options: [
          { text: "", image_url: "", is_correct: true },
          { text: "", image_url: "", is_correct: false },
          { text: "", image_url: "", is_correct: false },
          { text: "", image_url: "", is_correct: false },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, field: string, value: any) => {
    const newQuestions = [...questions];
    if (field === "is_correct") {
      newQuestions[qIndex].options.forEach((o, i) => {
        o.is_correct = i === oIndex;
      });
    } else {
      (newQuestions[qIndex].options[oIndex] as any)[field] = value;
    }
    setQuestions(newQuestions);
  };

  const saveQuiz = async () => {
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/quizzes/${id}` : "/api/quizzes";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions }),
    });
    navigate("/");
  };

  const generateWithAI = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      setTitle(data.title);
      setQuestions(data.questions);
    } catch (err) {
      console.error(err);
      alert("Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleImageInput = (key: string) => {
    setShowImageInputs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyTimeToAll = (time: number) => {
    setQuestions(questions.map((q) => ({ ...q, time_limit: time })));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-4xl font-bold bg-transparent border-none outline-none text-slate-900 flex-1 placeholder-slate-300"
            placeholder="Quiz Title"
          />
          <button
            onClick={saveQuiz}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <Save size={20} />
            Save Quiz
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Wand2 size={20} className="text-indigo-500" />
            Generate with AI
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="E.g., A fun trivia quiz about 90s pop culture"
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={generateWithAI}
              disabled={isGenerating || !aiPrompt}
              className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-lg font-bold text-slate-400">Q{qIndex + 1}</span>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                      placeholder="Question text"
                      className="flex-1 text-xl font-medium bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none py-1"
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                    {!showImageInputs[`q-${qIndex}`] && !q.image_url ? (
                      <button onClick={() => toggleImageInput(`q-${qIndex}`)} className="flex items-center gap-2 text-indigo-600 hover:underline">
                        <ImageIcon size={16} /> Add Question Image
                      </button>
                    ) : (
                      <label className="flex items-center gap-2">
                        <ImageIcon size={16} /> Image URL:
                        <input
                          type="text"
                          value={q.image_url || ""}
                          onChange={(e) => updateQuestion(qIndex, "image_url", e.target.value)}
                          placeholder="https://..."
                          className="border border-slate-200 rounded px-2 py-1 w-64"
                        />
                        <button onClick={() => { updateQuestion(qIndex, "image_url", ""); toggleImageInput(`q-${qIndex}`); }} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                      </label>
                    )}
                    <label className="flex items-center gap-2 ml-auto">
                      Time Limit (s):
                      <input
                        type="number"
                        value={q.time_limit}
                        onChange={(e) => updateQuestion(qIndex, "time_limit", parseInt(e.target.value))}
                        className="border border-slate-200 rounded px-2 py-1 w-20"
                      />
                    </label>
                    <button
                      onClick={() => applyTimeToAll(q.time_limit)}
                      className="text-indigo-600 hover:underline"
                    >
                      Apply to all
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeQuestion(qIndex)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt, oIndex) => (
                  <div
                    key={oIndex}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                      opt.is_correct ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={opt.is_correct}
                      onChange={() => updateOption(qIndex, oIndex, "is_correct", true)}
                      className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 flex flex-col gap-2">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(qIndex, oIndex, "text", e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="bg-transparent border-none outline-none font-medium text-slate-700"
                      />
                      {!showImageInputs[`o-${qIndex}-${oIndex}`] && !opt.image_url ? (
                        <button onClick={() => toggleImageInput(`o-${qIndex}-${oIndex}`)} className="text-xs text-indigo-500 hover:underline text-left w-fit">
                          + Add Image
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={opt.image_url || ""}
                            onChange={(e) => updateOption(qIndex, oIndex, "image_url", e.target.value)}
                            placeholder="Image URL"
                            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white flex-1"
                          />
                          <button onClick={() => { updateOption(qIndex, oIndex, "image_url", ""); toggleImageInput(`o-${qIndex}-${oIndex}`); }} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full mt-8 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-medium hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add Question
        </button>
      </div>
    </div>
  );
}
