fetch("train.csv")
  .then(res => res.text())
  .then(text => {
    const data = d3.csvParse(text);

    data.forEach(d => {
      d.Survived = +d.Survived;
      d.Age = d.Age === "" ? null : +d.Age;
      d.Fare = +d.Fare;
      d.SibSp = +d.SibSp;
      d.Parch = +d.Parch;
    });

    renderOverview(data);
    categoricalCharts(data);
    numericalCharts(data);
    correlationTable(data);
  });

/* ---------- 1. DATA OVERVIEW ---------- */

function renderOverview(data) {
  const info = `
    <p><strong>Rows:</strong> ${data.length}</p>
    <p><strong>Columns:</strong> ${Object.keys(data[0]).length}</p>
    <p><strong>Target variable:</strong> Survived (0 = Death, 1 = Survived)</p>
  `;
  document.getElementById("dataset-info").innerHTML = info;

  const missing = Object.keys(data[0]).map(col => {
    const miss = data.filter(d => d[col] === "" || d[col] === null).length;
    return { col, pct: (miss / data.length * 100).toFixed(1) };
  });

  document.getElementById("missing-table").innerHTML =
    "<tr><th>Feature</th><th>Missing %</th></tr>" +
    missing.map(d => `<tr><td>${d.col}</td><td>${d.pct}</td></tr>`).join("");

  const preview = data.slice(0, 5);
  document.getElementById("preview-table").innerHTML =
    "<tr>" + Object.keys(preview[0]).map(h => `<th>${h}</th>`).join("") + "</tr>" +
    preview.map(r =>
      "<tr>" + Object.values(r).map(v => `<td>${v}</td>`).join("") + "</tr>"
    ).join("");
}

/* ---------- 2. CATEGORICAL ---------- */

function deathRate(data, key) {
  const g = d3.group(data, d => d[key]);
  return [...g].map(([k, v]) => ({
    key: k || "Missing",
    rate: d3.mean(v, d => d.Survived === 0)
  }));
}

function barChart(id, labels, values, title) {
  new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: "#4b5563"
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: title }
      },
      scales: { y: { beginAtZero: true, max: 1 } }
    }
  });
}

function categoricalCharts(data) {
  const sex = deathRate(data, "Sex");
  barChart("sexChart", sex.map(d => d.key), sex.map(d => d.rate), "Death Rate by Sex");

  const pclass = deathRate(data, "Pclass");
  barChart("classChart", pclass.map(d => d.key), pclass.map(d => d.rate), "Death Rate by Class");

  const emb = deathRate(data, "Embarked");
  barChart("embarkedChart", emb.map(d => d.key), emb.map(d => d.rate), "Death Rate by Embarked");
}

/* ---------- 3. NUMERICAL ---------- */

function numericBinned(data, key, bins) {
  const values = data.filter(d => d[key] !== null).map(d => d[key]);
  const scale = d3.scaleLinear().domain(d3.extent(values)).nice(bins);
  const binner = d3.bin().domain(scale.domain()).thresholds(scale.ticks(bins));

  return binner(values).map(bin => {
    const rows = data.filter(d => d[key] >= bin.x0 && d[key] < bin.x1);
    return {
      label: `${bin.x0.toFixed(1)}–${bin.x1.toFixed(1)}`,
      death: d3.mean(rows, d => d.Survived === 0)
    };
  });
}

function numericalCharts(data) {
  ["Age", "Fare", "SibSp", "Parch"].forEach((k, i) => {
    const bins = numericBinned(data, k, 6);
    barChart(
      ["ageChart", "fareChart", "sibspChart", "parchChart"][i],
      bins.map(d => d.label),
      bins.map(d => d.death),
      `Death Rate by ${k}`
    );
  });
}

/* ---------- 4. CORRELATION ---------- */

function correlationTable(data) {
  const encode = d => ({
    Survived: d.Survived,
    Sex: d.Sex === "male" ? 1 : 0,
    Pclass: +d.Pclass,
    Age: d.Age,
    Fare: d.Fare,
    SibSp: d.SibSp,
    Parch: d.Parch,
    Embarked: d.Embarked === "S" ? 0 : d.Embarked === "C" ? 1 : 2
  });

  const clean = data.map(encode).filter(d => d.Age !== null);

  const corr = Object.keys(clean[0]).filter(k => k !== "Survived").map(k => ({
    feature: k,
    corr: d3.correlation(clean, d => d[k], d => d.Survived).toFixed(3)
  }));

  document.getElementById("correlation-table").innerHTML =
    "<tr><th>Feature</th><th>Pearson Correlation</th></tr>" +
    corr.map(d => `<tr><td>${d.feature}</td><td>${d.corr}</td></tr>`).join("");
}
