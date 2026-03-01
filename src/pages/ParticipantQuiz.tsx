import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { CheckCircle2, Clock, XCircle, Trophy } from "lucide-react";

export default function ParticipantQuiz() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState("connecting"); // connecting, waiting, question, leaderboard, finished
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);

  const teamName = location.state?.teamName;
  const members = location.state?.members;

  useEffect(() => {
    if (!teamName || !members) {
      navigate(`/join/${roomId}`);
      return;
    }

    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit("participant:join", { roomId, teamName, members }, (res: any) => {
      if (res.error) {
        alert(res.error);
        navigate(`/join/${roomId}`);
      } else {
        setStatus(res.sessionStatus);
      }
    });

    newSocket.on("quiz:question", ({ question, questionIndex, totalQuestions }) => {
      setStatus("question");
      setCurrentQuestion(question);
      setQuestionIndex(questionIndex);
      setTotalQuestions(totalQuestions);
      setSelectedOption(null);
      setTimeLeft(question.time_limit);
      setCorrectOptionId(null);
    });

    newSocket.on("quiz:leaderboard", ({ leaderboard, correctOptionId }) => {
      setStatus("leaderboard");
      setLeaderboard(leaderboard);
      setCorrectOptionId(correctOptionId);
    });

    newSocket.on("quiz:finished", ({ leaderboard }) => {
      setStatus("finished");
      setLeaderboard(leaderboard);
    });

    newSocket.on("participant:removed", () => {
      alert("You have been removed from the quiz by the host.");
      navigate("/");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, teamName, members, navigate]);

  useEffect(() => {
    if (status === "question" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, status]);

  const submitAnswer = (optionId: string) => {
    if (selectedOption || timeLeft === 0) return;
    setSelectedOption(optionId);
    socket?.emit("participant:answer", { roomId, optionId });
  };

  if (status === "connecting") return <div className="min-h-screen flex items-center justify-center bg-slate-50">Connecting...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 flex justify-between items-center border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
            {teamName?.charAt(0).toUpperCase()}
          </span>
          {teamName}
        </div>
        {status === "question" && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${timeLeft <= 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
            <Clock size={18} />
            {timeLeft}s
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
        {status === "waiting" && (
          <div className="text-center animate-fade-in">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">You're in!</h2>
            <p className="text-slate-500 text-lg">Waiting for the host to start the quiz...</p>
          </div>
        )}

        {status === "question" && currentQuestion && (
          <div className="w-full animate-fade-in-up">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              Question {questionIndex + 1} of {totalQuestions}
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 mb-6">
              {typeof currentQuestion.image_url === 'string' && currentQuestion.image_url.trim() !== '' && currentQuestion.image_url !== 'null' && (
                <img src={currentQuestion.image_url} alt="Question" className="w-full h-48 object-cover rounded-xl mb-4" />
              )}
              <h2 className="text-2xl font-bold text-slate-800 leading-snug">{currentQuestion.text}</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentQuestion.options.map((opt: any, i: number) => {
                const isSelected = selectedOption === opt.id;
                const isCorrect = correctOptionId === opt.id;
                const isWrong = correctOptionId && isSelected && !isCorrect;

                let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-500 hover:bg-indigo-50";
                if (isSelected) btnClass = "bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]";
                if (correctOptionId) {
                  if (isCorrect) btnClass = "bg-emerald-500 border-emerald-500 text-white shadow-lg";
                  else if (isWrong) btnClass = "bg-red-500 border-red-500 text-white shadow-lg";
                  else btnClass = "bg-slate-100 border-slate-200 text-slate-400 opacity-50";
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => submitAnswer(opt.id)}
                    disabled={!!selectedOption || timeLeft === 0 || !!correctOptionId}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left font-semibold text-lg transition-all duration-200 ${btnClass}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isSelected || correctOptionId ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {["A", "B", "C", "D"][i]}
                    </div>
                    {typeof opt.image_url === 'string' && opt.image_url.trim() !== '' && opt.image_url !== 'null' && (
                      <img src={opt.image_url} alt="Option" className="w-12 h-12 rounded object-cover" />
                    )}
                    <span className="flex-1">{opt.text || `Option ${i + 1}`}</span>
                    {isCorrect && <CheckCircle2 size={24} className="text-white" />}
                    {isWrong && <XCircle size={24} className="text-white" />}
                  </button>
                );
              })}
            </div>
            
            {selectedOption && !correctOptionId && (
              <div className="mt-8 text-center text-slate-500 font-medium animate-pulse">
                Answer submitted. Waiting for others...
              </div>
            )}
          </div>
        )}

        {status === "leaderboard" && (
          <div className="w-full text-center animate-fade-in">
            <Trophy size={64} className="text-yellow-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Leaderboard</h2>
            <p className="text-slate-500 mb-8">Get ready for the next question!</p>
            
            <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden text-left">
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-4 border-b border-slate-100 ${p.teamName === teamName ? "bg-indigo-50" : ""}`}>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold w-6 text-center ${i === 0 ? "text-yellow-500 text-xl" : i === 1 ? "text-slate-400 text-lg" : i === 2 ? "text-amber-600 text-lg" : "text-slate-400"}`}>
                      {i + 1}
                    </span>
                    <span className={`font-bold ${p.teamName === teamName ? "text-indigo-700" : "text-slate-700"}`}>
                      {p.teamName} {p.teamName === teamName && "(You)"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "finished" && (
          <div className="w-full text-center animate-fade-in">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold text-slate-900 mb-2">Quiz Finished!</h2>
            
            <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 mt-8 mb-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Final Standings</h3>
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between py-3 border-b border-slate-100 last:border-0 ${p.teamName === teamName ? "bg-indigo-50 -mx-6 px-6" : ""}`}>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold w-6 text-center ${i === 0 ? "text-yellow-500 text-2xl" : i === 1 ? "text-slate-400 text-xl" : i === 2 ? "text-amber-600 text-xl" : "text-slate-400"}`}>
                      {i + 1}
                    </span>
                    <span className={`font-bold text-lg ${p.teamName === teamName ? "text-indigo-700" : "text-slate-700"}`}>
                      {p.teamName} {p.teamName === teamName && "(You)"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 text-lg">{p.score} pts</span>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
