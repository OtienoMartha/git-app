# Quiz App — Week 2 Project

An interactive quiz application built with vanilla JavaScript. Answer 15 questions
one at a time, each with a 15-second timer. See your score, letter grade, and a
review of every answer at the end.

## 📁 Files

| File | Purpose |
|---|---|
| `index.html` | Screen structure (start / quiz / results / review) |
| `styles.css` | Responsive layout, colour feedback, progress bar, timer |
| `script.js` | Application logic, state, DOM updates, localStorage |
| `questions.js` | Quiz data — 15 question objects |

## 🚀 Live Demo

https://OtienoMartha.github.io/quiz-app/

## 📸 Screenshots

### Start screen
![Start](screenshots/start.png)

### Quiz screen
![Quiz](screenshots/quiz.png)

### Results screen
![Results](screenshots/results.png)

### Review mode
![Review](screenshots/review.png)

## ✨ Features

### Required
- One question at a time with four clickable options
- Progress bar and "Question X of Y" text
- Green feedback for correct, red for wrong (correct answer highlighted)
- 15-second countdown timer per question
- Auto-advance when the timer runs out
- Live score display during the quiz
- Results screen with score, percentage, letter grade, and message
- Review mode showing every question, your answer, and the correct one
- Restart button
- Last score saved to localStorage and shown on the start screen

### Bonus
- Category filter (Geography / Technology / Culture)
- Difficulty filter (Easy / Medium / Hard)
- Fisher-Yates shuffle so questions come in a different order each run
- Top-5 leaderboard stored in localStorage
- Sound effects via the Web Audio API (correct / wrong tones)
- Share Score button using `navigator.clipboard`
- Keyboard shortcuts: press 1–4 during the quiz

## 🧠 What I Practiced

- Grouping application state in a single object instead of loose variables
- Dynamic DOM creation with `document.createElement()`
- Event delegation and per-element event listeners
- `setInterval` / `clearInterval` for the timer
- Persisting structured data with `JSON.stringify` / `JSON.parse`
- Fisher-Yates shuffle algorithm
- Web Audio API for generating tones without audio files
- Screen management with CSS classes rather than page reloads

## ▶️ How to Run Locally

Open `index.html` in a browser, or use VS Code's Live Server extension.