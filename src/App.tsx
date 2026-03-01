/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import QuizEditor from "./pages/QuizEditor";
import HostQuiz from "./pages/HostQuiz";
import ParticipantJoin from "./pages/ParticipantJoin";
import ParticipantQuiz from "./pages/ParticipantQuiz";
import Results from "./pages/Results";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<QuizEditor />} />
        <Route path="/editor/:id" element={<QuizEditor />} />
        <Route path="/host/:roomId" element={<HostQuiz />} />
        <Route path="/join/:roomId" element={<ParticipantJoin />} />
        <Route path="/play/:roomId" element={<ParticipantQuiz />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}
