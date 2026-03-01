import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Users, ArrowRight } from "lucide-react";

export default function ParticipantJoin() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState(["", "", "", ""]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const handleJoin = () => {
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }
    if (members.some((m) => !m.trim())) {
      setError("All 4 member names are required");
      return;
    }

    const socket = io();
    socket.emit("participant:join", { roomId, teamName, members }, (res: any) => {
      if (res.error) {
        setError(res.error);
        socket.disconnect();
      } else {
        // Store socket info or just navigate and let the next page handle connection
        // Actually, we need to keep the socket connection. 
        // Better to pass the data to the play route and connect there.
        socket.disconnect();
        navigate(`/play/${roomId}`, { state: { teamName, members } });
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Join Quiz</h1>
          <p className="text-slate-500 font-mono bg-slate-100 inline-block px-3 py-1 rounded-lg">Room: {roomId}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
                placeholder="e.g. The Brainiacs"
                autoFocus
              />
            </div>
            <button
              onClick={() => {
                if (teamName.trim()) {
                  setStep(2);
                  setError("");
                } else {
                  setError("Team name is required");
                }
              }}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              Next <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Users size={18} className="text-indigo-500" />
                Team Members (4 required)
              </label>
              <div className="space-y-3">
                {members.map((m, i) => (
                  <input
                    key={i}
                    type="text"
                    value={m}
                    onChange={(e) => {
                      const newMembers = [...members];
                      newMembers[i] = e.target.value;
                      setMembers(newMembers);
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={`Member ${i + 1} Name`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors shadow-md"
              >
                Join Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
