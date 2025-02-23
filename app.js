const TIMEOUT_SECONDS = 10;
const API_URL = "http://localhost:5000";

const timeout = function (s) {
  return new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error(`Request took too long! Timeout after ${s} second`));
    }, s * 1000);
  });
};

const getJSON = async function (url) {
  try {
    const res = await Promise.race([fetch(url), timeout(TIMEOUT_SECONDS)]);
    const data = await res.json();

    if (!res.ok) throw new Error(`${data.message} ${res.status}`);
    return data;
  } catch (err) {
    throw err;
  }
};

const getVideoId = function (url) {
  if (validateYouTubeUrl(url)) {
    const pattern =
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(pattern);

    return match ? match[1] : null;
  }
  return null;
};

const validateYouTubeUrl = function (url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return pattern.test(url);
};

const state = {
  videoId: "",
  summary: "",
  title: "",
  thumbnailUrl: "",
};

const loadSummary = async function () {
  try {
    const data = await getJSON(`${API_URL}/summary?v=${state.videoId}`);
    state.summary = data.data;
    renderSummary();
  } catch (err) {
    renderError("Failed to fetch summary.");
  }
};

const loadMetaData = async function (videoId) {
  try {
    const requestUrl = `https://youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(requestUrl);
    if (!res.ok) throw new Error("Failed to fetch metadata");
    const data = await res.json();
    state.title = data.title;
    state.thumbnailUrl = data.thumbnail_url;
    displayMetaData();
  } catch (err) {
    renderError("Failed to fetch metadata.");
  }
};

const metaDataParent = document.querySelector(".meta-data-container");
const summaryParent = document.querySelector(".summary-container");
const button1 = document.querySelector("#button1");
const search = document.querySelector("#search-input");

const displayMetaData = function () {
  clear(metaDataParent);
  const markup = `
    <div id="video-title">${state.title}</div>
    <div id="video-thumbnail"><img src="${state.thumbnailUrl}" alt="${state.title}"></div>
  `;
  metaDataParent.insertAdjacentHTML("afterbegin", markup);
};

const getVideoUrl = function () {
  const url = search.value;
  search.value = "";
  return url;
};

const clear = function (element) {
  element.innerHTML = "";
};

const renderSpinnerMetaData = function () {
  clear(metaDataParent);
  metaDataParent.insertAdjacentHTML("afterbegin", `<div class="spinner"></div>`);
};

const renderSpinnerSummary = function () {
  clear(summaryParent);
  summaryParent.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="summary">
      <h2>Video Summary:</h2>
      <div class="spinner-container">
        <div class="spinner"></div>
      </div>
    </div>
  `
  );
};

const renderSummary = function () {
  clear(summaryParent);
  const summary = state.summary
    .replace(/\n/g, "<br>")
    .replace(/(\d+)\./g, "<b>$1.</b>");
  summaryParent.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="summary">
      <h2>Video Summary:</h2>
      <div class="summary-text">${summary}</div>
    </div>
  `
  );
};

const renderError = function (errorMessage) {
  clear(metaDataParent);
  clear(summaryParent);
  metaDataParent.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="error">
      <div class="error-text">${errorMessage}</div>
    </div>
  `
  );
};

const scrollToSummary = function () {
  summaryParent.scrollIntoView({ behavior: "smooth", block: "start" });
};

const addHandlerSearch = function () {
  button1.addEventListener("click", function (e) {
    e.preventDefault();
    const url = getVideoUrl();
    const videoId = getVideoId(url);
    if (videoId) {
      state.videoId = videoId;
      renderSpinnerMetaData();
      renderSpinnerSummary();
      loadMetaData(videoId);
      loadSummary();
    } else {
      renderError("Invalid YouTube URL");
    }
  });

  search.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      button1.click();
    }
  });
};

addHandlerSearch();

const quizButton = document.querySelector(".quiz-button");
const quizParent = document.createElement("div");
quizParent.classList.add("quiz-container");
document.querySelector("main").appendChild(quizParent);

const loadQuiz = async function () {
  try {
    const data = await getJSON(`${API_URL}/quiz?v=${state.videoId}`);
    console.log(data)
    renderQuiz(data.questions);
  } catch (err) {
    renderError("Failed to fetch quiz.");
  }
};

// const renderQuiz = function (questions) {
//     clear(quizParent);
  
//     questions.forEach((question, index) => {
//       const optionsHtml = question.options
//         .map(
//           (option, i) =>
//             `<label>
//               <input type="radio" name="q${index}" value="${option}">
//               ${option}
//             </label><br>`
//         )
//         .join("");
  
//       const markup = `
//         <div class="quiz-question">
//           <p><b>Q${index + 1}:</b> ${question.question}</p>
//           ${optionsHtml}
//           <button class="submit-answer" data-index="${index}" data-answer="${question.correctAnswer}">Submit</button>
//           <p class="feedback" id="feedback-${index}"></p>
//         </div>
//       `;
//       quizParent.insertAdjacentHTML("beforeend", markup);
//     });
  
//     document.querySelectorAll(".submit-answer").forEach((button) => {
//       button.addEventListener("click", function () {
//         const index = this.dataset.index;
//         const correctAnswer = this.dataset.answer.trim().toLowerCase(); // Normalize correct answer
//         const selectedOption = document.querySelector(
//           `input[name="q${index}"]:checked`
//         );
  
//         const feedback = document.querySelector(`#feedback-${index}`);
  
//         if (!selectedOption) {
//           feedback.textContent = "Please select an answer.";
//           feedback.style.color = "red";
//           return;
//         }
  
//         // Normalize the selected answer (trim spaces & lowercase)
//         const userAnswer = selectedOption.value.trim().toLowerCase();
  
//         // Debugging logs
//         console.log(`User Answer: "${userAnswer}"`);
//         console.log(`Correct Answer: "${correctAnswer}"`);
  
//         // Disable all radio buttons for this question after submission
//         document.querySelectorAll(`input[name="q${index}"]`).forEach(input => {
//           input.disabled = true;
//         });
  
//         // Disable the submit button after clicking
//         this.disabled = true;
  
//         if (userAnswer === correctAnswer) {
//           feedback.textContent = "✅ Correct!";
//           feedback.style.color = "green";
//         } else {
//           feedback.textContent = `❌ Incorrect! The correct answer is: ${this.dataset.answer}`;
//           feedback.style.color = "red";
//         }
//       });
//     });
//   };
const renderQuiz = function (questions) {
    clear(quizParent);
  
    questions.forEach((question, index) => {
      const optionsHtml = question.options
        .map(
          (option, i) =>
            `<label>
              <input type="radio" name="q${index}" value="${option}">
              ${option}
            </label><br>`
        )
        .join("");
  
      // Check if correctAnswer is a single letter (A, B, C, or D)
      let correctAnswer = question.correctAnswer;
      if (/^[A-D]$/.test(correctAnswer)) {
        // Convert "A", "B", "C", "D" to corresponding full-text option
        const optionIndex = correctAnswer.charCodeAt(0) - 65; // 'A' = 65, 'B' = 66, etc.
        correctAnswer = question.options[optionIndex]; // Get full answer text
      }
  
      const markup = `
        <div class="quiz-question">
          <p><b>Q${index + 1}:</b> ${question.question}</p>
          ${optionsHtml}
          <button class="submit-answer" data-index="${index}" data-answer="${correctAnswer}">Submit</button>
          <p class="feedback" id="feedback-${index}"></p>
        </div>
      `;
      quizParent.insertAdjacentHTML("beforeend", markup);
    });
  
    document.querySelectorAll(".submit-answer").forEach((button) => {
      button.addEventListener("click", function () {
        const index = this.dataset.index;
        const correctAnswer = this.dataset.answer; // Now this is always full-text
        const selectedOption = document.querySelector(
          `input[name="q${index}"]:checked`
        );
  
        const feedback = document.querySelector(`#feedback-${index}`);
  
        if (!selectedOption) {
          feedback.textContent = "Please select an answer.";
          feedback.style.color = "red";
          return;
        }
  
        if (selectedOption.value === correctAnswer) {
          feedback.textContent = "Correct!";
          feedback.style.color = "green";
        } else {
          feedback.textContent = `Incorrect! The correct answer is: ${correctAnswer}`;
          feedback.style.color = "red";
        }
      });
    });
  };
  
  

quizButton.addEventListener("click", function () {
  if (!state.videoId) {
    renderError("Please fetch a video summary first.");
    return;
  }
  loadQuiz();
});
const validateQuizData = (data) => {
    // Check if questions is an array and has exactly 4 elements
    if (!Array.isArray(data.questions) || data.questions.length !== 4) {
      console.error("Invalid quiz: There must be exactly 4 questions.");
      return false;
    }
    
    // Define valid answer letters
    const validAnswers = ["A", "B", "C", "D"];
    
    // Validate each question object
    for (let i = 0; i < data.questions.length; i++) {
      const question = data.questions[i];
      
      // Check if question text is non-empty
      if (!question.question || typeof question.question !== "string" || question.question.trim() === "") {
        console.error(`Invalid quiz: Question ${i+1} is missing a valid question text.`);
        return false;
      }
      
      // Check if options is an array with exactly 4 elements
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        console.error(`Invalid quiz: Question ${i+1} must have exactly 4 options.`);
        return false;
      }
      
      // Check if correctAnswer is one of the valid answers
      if (!validAnswers.includes(question.correctAnswer)) {
        console.error(`Invalid quiz: Question ${i+1} has an invalid correctAnswer. Expected one of ${validAnswers.join(", ")}.`);
        return false;
      }
    }
    
    // If all validations pass
    return true;
  };
  
  // Example usage when receiving quiz data from the backend
//   const loadQuiz = async function () {
//     try {
//       const data = await getJSON(`${API_URL}/quiz?v=${state.videoId}`);
      
//       if (validateQuizData(data)) {
//         renderQuiz(data.questions);
//       } else {
//         renderError("Quiz data validation failed.");
//       }
      
//     } catch (err) {
//       renderError("Failed to fetch quiz.");
//     }
//   };
  