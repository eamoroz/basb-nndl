fetch("train.csv")
  .then(r => r.text())
  .then(text => {
    const data = d3.csvParse(text, d3.autoType);
    initDashboard(data);
  });

function initDashboard(data) {
  dataOverview(data);
  categoricalCharts(data);
  numericalCharts(data);
  correlationAnalysis(data);
}

/* ---------- 1. DATA OVERVIEW ---------- */
function dataOverview(data) {
  const cols = Object.keys(data[0]);

  document.getElementById("dataset-dimensions").innerText =
    `${data.length} rows × ${cols.length} columns`;

  const missing = cols.map(c => ({
    feature: c,
    missing: data.filter(d => d[c] === null || d[c] === "").length
  }));

  renderTable("missing-table", missing, ["feature", "missing"]);
  renderTable("preview-table", data.slice(0,5), cols);
}

/* ---------- 2. CATEGORICAL ---------- */
function deathRate(data, key) {
  const grouped = d3.group(data, d => d[key] ?? "Missing");
  return Array.from(grouped, ([k, v]) => ({
    label: k,
    rate: v.filter(d => d.Survived === 0).length / v.length
  }));
}

function categoricalCharts(data) {
  barChart("sexChart", deathRate(data, "Sex"), "Death Rate by Sex");
  barChart("classChart", deathRate(data, "Pclass"), "Death Rate by Class");
  barChart("embarkedChart", deathRate(data, "Embarked"), "Death Rate by Embarked");
  barChart("sibspChart", deathRate(data, "SibSp"), "Death Rate by SibSp");
  barChart("parchChart", deathRate(data, "Parch"), "Death Rate by Parch");
}

/* ---------- 3. NUMERICAL ---------- */
function numericalCharts(data) {
  const age = data.filter(d => d.Age !== null);
  boxChart("ageChart", age, "Age");
  boxChart("fareChart", data, "Fare");
}

/* ---------- 4. CORRELATION ---------- */
function correlationAnalysis(data) {
  const encode = d => ({
    Survived: d.Survived,
    Sex: d.Sex === "male" ? 1 : 0,
    Pclass: d.Pclass,
    Age: d.Age,
    Fare: d.Fare,
    SibSp: d.SibSp,
    Parch: d.Parch,
    Embarked:
      d.Embarked === "C" ? 1 :
      d.Embarked === "Q" ? 2 : 0
  });

  const encoded = data.map(encode);
  const features = Object.keys(encoded[0]).filter(f => f !== "Survived");

  const correlations = features.map(f => ({
    Feature: f,
    Correlation: pearson(
      encoded.map(d => d[f]),
      encoded.map(d => d.Survived)
    )
  }));

  renderTable("correlation-table", correlations, ["Feature", "Correlation"]);
}

/* ---------- HELPERS ---------- */
function pearson(x, y) {
  const valid = x.map((v,i)=>[v,y[i]]).filter(d=>d[0]!=null);
  const mx = d3.mean(valid, d=>d[0]);
  const my = d3.mean(valid, d=>d[1]);
  const num = d3.sum(valid, d => (d[0]-mx)*(d[1]-my));
  const den = Math.sqrt(
    d3.sum(valid, d => (d[0]-mx)**2) *
    d3.sum(valid, d => (d[1]-my)**2)
  );
  return +(num / den).toFixed(3);
}

function renderTable(id, rows, cols) {
  const table = document.getElementById(id);
  table.innerHTML = "";

  const thead = table.createTHead().insertRow();
  cols.forEach(c => thead.insertCell().innerText = c);

  const tbody = table.createTBody();
  rows.forEach(r => {
    const row = tbody.insertRow();
    cols.forEach(c => row.insertCell().innerText = r[c]);
  });
}

function barChart(id, data, title) {
  new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.rate),
        backgroundColor: "#6b7280"
      }]
    },
    options: {
      plugins: { title: { display: true, text: title } },
      scales: { y: { beginAtZero: true, max: 1 } }
    }
  });
}

function boxChart(id, data, key) {
  const grouped = d3.group(data, d => d.Survived);
  const stats = [0,1].map(s => {
    const v = grouped.get(s).map(d => d[key]).filter(d => d!=null).sort(d3.ascending);
    return d3.mean(v);
  });

  new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels: ["Died", "Survived"],
      datasets: [{
        data: stats,
        backgroundColor: "#9ca3af"
      }]
    },
    options: {
      plugins: { title: { display: true, text: `Mean ${key} by Survival` } }
    }
  });
}
