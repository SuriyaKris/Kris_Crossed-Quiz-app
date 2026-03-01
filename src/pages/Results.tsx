import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, Trophy } from "lucide-react";

export default function Results() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch("/api/results")
      .then((res) => res.json())
      .then(setResults);
  }, []);

  const deleteResult = async (id: string) => {
    if (confirm("Are you sure you want to delete this result?")) {
      await fetch(`/api/results/${id}`, { method: "DELETE" });
      setResults(results.filter((r: any) => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Quiz Results</h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {results.map((result: any) => {
            const data = JSON.parse(result.data);
            return (
              <div key={result.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">{result.title}</h3>
                    <p className="text-sm text-slate-500">
                      Played on {new Date(result.date).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteResult(result.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Result"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">Rank</th>
                        <th className="px-6 py-4 font-semibold">Team Name</th>
                        <th className="px-6 py-4 font-semibold">Members</th>
                        <th className="px-6 py-4 font-semibold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.map((team: any, index: number) => (
                        <tr key={team.id} className="hover:bg-white transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Trophy size={18} className="text-yellow-500" />}
                              <span className={`font-bold ${index === 0 ? "text-yellow-600" : index === 1 ? "text-slate-500" : index === 2 ? "text-amber-700" : "text-slate-400"}`}>
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{team.teamName}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{team.members.join(", ")}</td>
                          <td className="px-6 py-4 font-mono font-bold text-emerald-600 text-right">{team.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {results.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
              No quiz results yet. Host a quiz to see results here!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
