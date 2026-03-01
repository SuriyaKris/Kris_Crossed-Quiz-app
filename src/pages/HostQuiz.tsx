import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { Users, Play, SkipForward, BarChart2, XCircle } from "lucide-react";

export default function HostQuiz() {
  const { roomId: quizId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [status, setStatus] = useState("waiting"); // waiting, question, leaderboard, finished
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit("host:create_session", quizId, (res: any) => {
      if (res.error) {
        alert(res.error);
        navigate("/");
        return;
      }
      setSession(res);
      setTotalQuestions(res.quiz.questions.length);
    });

    newSocket.on("host:participant_joined", (parts) => {
      setParticipants(parts);
    });

    newSocket.on("quiz:question", ({ question, questionIndex, totalQuestions }) => {
      setStatus("question");
      setCurrentQuestion(question);
      setQuestionIndex(questionIndex);
      setTotalQuestions(totalQuestions);
      setTimeLeft(question.time_limit);
      setAnsweredCount(0);
    });

    newSocket.on("host:participant_answered", ({ totalAnswered }) => {
      setAnsweredCount(totalAnswered);
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

    return () => {
      newSocket.disconnect();
    };
  }, [quizId, navigate]);

  useEffect(() => {
    if (status === "question" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status === "question" && timeLeft === 0) {
      socket?.emit("host:show_leaderboard", { roomId: session?.roomId });
    }
  }, [timeLeft, status, socket, session]);

  const startQuiz = () => {
    socket?.emit("host:start_quiz", { roomId: session?.roomId });
  };

  const nextQuestion = () => {
    socket?.emit("host:next_question", { roomId: session?.roomId });
  };

  const removeParticipant = (id: string) => {
    socket?.emit("host:remove_participant", { roomId: session?.roomId, participantId: id });
  };

  if (!session) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const joinUrl = `${window.location.origin}/join/${session.roomId}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      {/* Top Bar with QR Code */}
      <div className="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700 shadow-md">
        <div className="flex items-center gap-6">
          <div className="bg-white p-2 rounded-xl">
            <QRCodeSVG value={joinUrl} size={80} />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Join at</p>
            <p className="text-2xl font-bold text-emerald-400">{window.location.host}/join</p>
            <p className="text-slate-400 mt-1">Room Code: <span className="text-white font-mono text-xl">{session.roomId}</span></p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold">{session.quiz.title}</h1>
          <p className="text-slate-400 flex items-center justify-end gap-2 mt-2">
            <Users size={18} /> {participants.length} Participants
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        {status === "waiting" && (
          <div className="w-full max-w-4xl text-center">
            <h2 className="text-5xl font-bold mb-12">Waiting for players...</h2>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {participants.map((p) => (
                <div key={p.id} className="bg-slate-800 px-6 py-3 rounded-full flex items-center gap-3 border border-slate-700 shadow-lg animate-fade-in">
                  <span className="font-semibold text-lg">{p.teamName}</span>
                  <button onClick={() => removeParticipant(p.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <XCircle size={20} />
                  </button>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-slate-500 text-xl">Scan the QR code to join!</p>
              )}
            </div>
            <button
              onClick={startQuiz}
              disabled={participants.length === 0}
              className="px-12 py-4 bg-emerald-500 text-white text-2xl font-bold rounded-2xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
            >
              <Play size={28} />
              Start Quiz
            </button>
          </div>
        )}

        {status === "question" && currentQuestion && (
          <div className="w-full max-w-5xl">
            <div className="flex justify-between items-center mb-8">
              <span className="text-2xl font-bold text-slate-400">Question {questionIndex + 1} of {totalQuestions}</span>
              <div className="flex items-center gap-6">
                <span className="text-xl text-slate-300">{answeredCount} / {participants.length} Answers</span>
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center text-4xl font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  {timeLeft}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-700 mb-8 text-center">
              {typeof currentQuestion.image_url === 'string' && currentQuestion.image_url.trim() !== '' && currentQuestion.image_url !== 'null' && (
                <img src={currentQuestion.image_url} alt="Question" className="max-h-64 mx-auto mb-6 rounded-xl object-contain" />
              )}
              <h2 className="text-4xl font-bold leading-tight">{currentQuestion.text}</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {currentQuestion.options.map((opt: any, i: number) => (
                <div key={opt.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4 text-2xl font-medium">
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-bold">
                    {["A", "B", "C", "D"][i]}
                  </div>
                  {typeof opt.image_url === 'string' && opt.image_url.trim() !== '' && opt.image_url !== 'null' && (
                    <img src={opt.image_url} alt="Option" className="w-16 h-16 rounded object-cover" />
                  )}
                  <span>{opt.text || `Option ${i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "leaderboard" && (
          <div className="w-full max-w-4xl text-center">
            <h2 className="text-4xl font-bold mb-8 flex items-center justify-center gap-3 text-emerald-400">
              <BarChart2 size={40} /> Leaderboard
            </h2>
            <div className="bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden mb-8">
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-6 border-b border-slate-700 ${i === 0 ? "bg-slate-700/50" : ""}`}>
                  <div className="flex items-center gap-6">
                    <span className={`text-3xl font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"}`}>
                      #{i + 1}
                    </span>
                    <div className="text-left">
                      <p className="text-2xl font-bold">{p.teamName}</p>
                      <p className="text-sm text-slate-400">{p.members.join(", ")}</p>
                    </div>
                  </div>
                  <span className="text-3xl font-mono font-bold text-emerald-400">{p.score} pts</span>
                </div>
              ))}
            </div>
            <button
              onClick={nextQuestion}
              className="px-10 py-4 bg-indigo-500 text-white text-xl font-bold rounded-2xl hover:bg-indigo-600 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
            >
              Next Question <SkipForward size={24} />
            </button>
          </div>
        )}

        {status === "finished" && (
          <div className="w-full max-w-4xl text-center">
            <h2 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Quiz Finished!
            </h2>
            <p className="text-2xl text-slate-400 mb-12">Final Results</p>
            
            <div className="flex justify-center items-end gap-6 mb-16 h-64">
              {/* 2nd Place */}
              {leaderboard[1] && (
                <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                  <div className="text-2xl font-bold mb-2">{leaderboard[1].teamName}</div>
                  <div className="text-emerald-400 font-mono mb-4">{leaderboard[1].score} pts</div>
                  <div className="w-32 h-32 bg-slate-700 rounded-t-lg border-t-4 border-slate-300 flex items-start justify-center pt-4 text-4xl font-bold text-slate-400">2</div>
                </div>
              )}
              {/* 1st Place */}
              {leaderboard[0] && (
                <div className="flex flex-col items-center animate-fade-in-up z-10">
                  <div className="text-3xl font-bold mb-2 text-yellow-400">{leaderboard[0].teamName}</div>
                  <div className="text-emerald-400 font-mono text-xl mb-4">{leaderboard[0].score} pts</div>
                  <div className="w-40 h-48 bg-slate-600 rounded-t-lg border-t-4 border-yellow-400 flex items-start justify-center pt-4 text-5xl font-bold text-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]">1</div>
                </div>
              )}
              {/* 3rd Place */}
              {leaderboard[2] && (
                <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                  <div className="text-xl font-bold mb-2">{leaderboard[2].teamName}</div>
                  <div className="text-emerald-400 font-mono mb-4">{leaderboard[2].score} pts</div>
                  <div className="w-32 h-24 bg-slate-800 rounded-t-lg border-t-4 border-amber-600 flex items-start justify-center pt-4 text-3xl font-bold text-amber-600">3</div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-slate-700 text-white text-lg font-medium rounded-xl hover:bg-slate-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
