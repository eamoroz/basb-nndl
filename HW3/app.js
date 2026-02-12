// app.js (ES module version using transformers.js for local sentiment classification
// + logging to Google Sheets via Google Apps Script)

import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

// ============================
// CONFIG
// ============================

// 🔴 ВСТАВЬ СЮДА СВОЙ URL ИЗ GOOGLE APPS SCRIPT
const LOG_ENDPOINT = "https://script.google.com/macros/s/AKfycbzcVA-7HVNvtWUgaAeG4o0iyV_LJ1g9Jouj0bhUGIgT97-xwyc8RDWHGkKkCatdenIGNQ/exec";

// ============================
// GLOBAL STATE
// ============================

let reviews = [];
let apiToken = ""; // kept for UI compatibility
let sentimentPipeline = null;

// ============================
// DOM ELEMENTS
// ============================

const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");
const apiTokenInput = document.getElementById("api-token");
const statusElement = document.getElementById("status");

// ============================
// INITIALIZATION
// ============================

document.addEventListener("DOMContentLoaded", function () {
  loadReviews();

  analyzeBtn.addEventListener("click", analyzeRandomReview);
  apiTokenInput.addEventListener("change", saveApiToken);

  const savedToken = localStorage.getItem("hfApiToken");
  if (savedToken) {
    apiTokenInput.value = savedToken;
    apiToken = savedToken;
  }

  initSentimentModel();
});

// ============================
// MODEL LOADING
// ============================

async function initSentimentModel() {
  try {
    if (statusElement) {
      statusElement.textContent = "Loading sentiment model...";
    }

    sentimentPipeline = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );

    if (statusElement) {
      statusElement.textContent = "Sentiment model ready";
    }
  } catch (error) {
    console.error("Model load failed:", error);
    showError("Failed to load sentiment model.");
    if (statusElement) {
      statusElement.textContent = "Model load failed";
    }
  }
}

// ============================
// LOAD TSV
// ============================

function loadReviews() {
  fetch("reviews_test.tsv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load TSV file");
      }
      return response.text();
    })
    .then((tsvData) => {
      Papa.parse(tsvData, {
        header: true,
        delimiter: "\t",
        complete: (results) => {
          reviews = results.data
            .map((row) => row.text)
            .filter((text) => typeof text === "string" && text.trim() !== "");

          console.log("Loaded reviews:", reviews.length);
        },
        error: (error) => {
          console.error("TSV parse error:", error);
          showError("Failed to parse TSV file.");
        },
      });
    })
    .catch((error) => {
      console.error("TSV load error:", error);
      showError("Failed to load TSV file.");
    });
}

// ============================
// SAVE TOKEN (UI ONLY)
// ============================

function saveApiToken() {
  apiToken = apiTokenInput.value.trim();
  if (apiToken) {
    localStorage.setItem("hfApiToken", apiToken);
  } else {
    localStorage.removeItem("hfApiToken");
  }
}

// ============================
// MAIN ANALYSIS FLOW
// ============================

function analyzeRandomReview() {
  hideError();

  if (!reviews.length) {
    showError("No reviews loaded.");
    return;
  }

  if (!sentimentPipeline) {
    showError("Model not ready yet.");
    return;
  }

  const selectedReview =
    reviews[Math.floor(Math.random() * reviews.length)];

  reviewText.textContent = selectedReview;

  loadingElement.style.display = "block";
  analyzeBtn.disabled = true;
  sentimentResult.innerHTML = "";
  sentimentResult.className = "sentiment-result";

  analyzeSentiment(selectedReview)
    .then((result) => displaySentiment(result, selectedReview))
    .catch((error) => {
      console.error("Analysis error:", error);
      showError("Failed to analyze sentiment.");
    })
    .finally(() => {
      loadingElement.style.display = "none";
      analyzeBtn.disabled = false;
    });
}

// ============================
// SENTIMENT ANALYSIS
// ============================

async function analyzeSentiment(text) {
  if (!sentimentPipeline) {
    throw new Error("Model not initialized.");
  }

  const output = await sentimentPipeline(text);

  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("Invalid model output.");
  }

  return output[0]; // { label, score }
}

// ============================
// DISPLAY + LOGGING
// ============================

function displaySentiment(result, review) {
  let sentiment = "neutral";
  let score = result.score ?? 0.5;
  let label = (result.label || "NEUTRAL").toUpperCase();

  if (label === "POSITIVE" && score > 0.5) {
    sentiment = "positive";
  } else if (label === "NEGATIVE" && score > 0.5) {
    sentiment = "negative";
  }

  sentimentResult.classList.add(sentiment);
  sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
    `;

  // 🔥 ЛОГИРОВАНИЕ В GOOGLE SHEET
  logToGoogleSheet(review, label, score);
}

// ============================
// GOOGLE SHEETS LOGGING
// ============================

async function logToGoogleSheet(review, label, score) {
  if (!LOG_ENDPOINT || LOG_ENDPOINT.includes("PASTE_")) {
    console.warn("LOG_ENDPOINT not configured.");
    return;
  }

  const payload = {
    ts_iso: new Date().toISOString(),
    review: review,
    sentiment: `${label} (${(score * 100).toFixed(1)}%)`,
    meta: {
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };

  try {
    await fetch(LOG_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Logging failed:", error);
  }
}

// ============================
// HELPERS
// ============================

function getSentimentIcon(sentiment) {
  switch (sentiment) {
    case "positive":
      return "fa-thumbs-up";
    case "negative":
      return "fa-thumbs-down";
    default:
      return "fa-question-circle";
  }
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function hideError() {
  errorElement.style.display = "none";
}
