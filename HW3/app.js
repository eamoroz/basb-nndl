import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

const LOG_ENDPOINT = "https://script.google.com/macros/s/AKfycbznk8K-0C-WC7oCqL7aSi_4n6EUN-0TjX9pfKR2ZHURBgSTNdFEQ2F1opfFI0jFTtGq3w/exec";

let reviews = [];
let sentimentPipeline = null;

const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const actionBox = document.getElementById("action-box");
const errorElement = document.getElementById("error-message");

document.addEventListener("DOMContentLoaded", async () => {
  loadReviews();
  sentimentPipeline = await pipeline(
    "text-classification",
    "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
  );
});

analyzeBtn.addEventListener("click", analyzeRandomReview);

function loadReviews() {
  fetch("reviews_test.tsv")
    .then(res => res.text())
    .then(data => {
      Papa.parse(data, {
        header: true,
        delimiter: "\t",
        complete: results => {
          reviews = results.data.map(r => r.text).filter(Boolean);
        }
      });
    });
}

async function analyzeRandomReview() {
  errorElement.textContent = "";

  if (!reviews.length || !sentimentPipeline) {
    errorElement.textContent = "Model not ready.";
    return;
  }

  const review = reviews[Math.floor(Math.random() * reviews.length)];
  reviewText.textContent = review;

  const result = await sentimentPipeline(review);
  const { label, score } = result[0];

  const sentimentText = `${label} (${(score * 100).toFixed(1)}%)`;
  sentimentResult.textContent = sentimentText;

  const action = mapSentimentToAction(label);

  displayAction(action);
  logToGoogleSheet(review, sentimentText, action);
}

function mapSentimentToAction(label) {
  if (label === "NEGATIVE") return "OFFER_COUPON";
  if (label === "POSITIVE") return "UPSELL_PRODUCT";
  return "NO_ACTION";
}

function displayAction(action) {
  if (action === "OFFER_COUPON") {
    actionBox.textContent = "We're sorry! Here is a 10% coupon.";
  } else if (action === "UPSELL_PRODUCT") {
    actionBox.textContent = "You might love our premium version!";
  } else {
    actionBox.textContent = "Thanks for your feedback!";
  }
}

async function logToGoogleSheet(review, sentiment, action) {
  const payload = {
    ts_iso: new Date().toISOString(),
    review,
    sentiment,
    meta: {
      userAgent: navigator.userAgent,
      url: window.location.href
    },
    action_taken: action
  };

  await fetch(LOG_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
