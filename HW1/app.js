fetch("train.csv")
  .then(res => res.text())
  .then(text => {
    const data = d3.csvParse(text, d3.autoType);

    /* ======================
       1. DATA OVERVIEW
    ====================== */

    document.getElementById("overview").innerHTML = `
      Rows: ${data.length}<br>
      Columns: ${Object.keys(data[0]).length}
    `;

    const missing = {};
    Object.keys(data[0]).forEach(col => {
      missing[col] = data.filter(d => d[col] === null || d[col] === "").length;
    });

    const missingTable = document.getElementById("missing-table");
    missingTable.innerHTML = "<tr><th>Feature</th><th>Missing Values</th></tr>";
    Object.entries(missing).forEach(([k, v]) => {
      missingTable.innerHTML += `<tr><td>${k}</td><td>${v}</td></tr>`;
    });

    const preview = data.slice(0, 5);
    const previewTable = document.getElementById("preview-table");
    previewTable.innerHTML =
      "<tr>" + Object.keys(preview[0]).map(d => `<th>${d}</th>`).join("") + "</tr>";
    preview.forEach(row => {
      previewTable.innerHTML +=
        "<tr>" + Object.values(row).map(v => `<td>${v}</td>`).join("") + "</tr>";
    });

    /* ======================
       Helper Functions
    ====================== */

    function deathRateBy(feature) {
      const groups = d3.group(data, d => d[feature]);
      return Array.from(groups, ([key, values]) => {
        const rate = values.filter(d => d.Survived === 0).length / values.length;
        return { key, rate };
      });
    }

    function barChart(id, title, dataset) {
      new Chart(document.getElementById(id), {
        type: "bar",
        data: {
          labels: dataset.map(d => d.key),
          datasets: [{
            label: "Death Rate",
            data: dataset.map(d => d.rate),
            backgroundColor: "#444"
          }]
        },
        options: {
          plugins: { title: { display: true, text: title } },
          scales: { y: { min: 0, max: 1 } }
        }
      });
    }

    /* ======================
       2. CATEGORICAL ANALYSIS
    ====================== */

    barChart("sexChart", "Death Rate by Sex", deathRateBy("Sex"));
    barChart("classChart", "Death Rate by Passenger Class", deathRateBy("Pclass"));
    barChart("embarkedChart", "Death Rate by Embarkation Port", deathRateBy("Embarked"));
    barChart("sibspChart", "Death Rate by SibSp", deathRateBy("SibSp"));
    barChart("parchChart", "Death Rate by Parch", deathRateBy("Parch"));

    /* ======================
       3. NUMERICAL FEATURES
    ====================== */

    function binnedComparison(feature, bins, title, canvasId) {
      const clean = data.filter(d => d[feature] != null);
      const survived = clean.filter(d => d.Survived === 1);
      const died = clean.filter(d => d.Survived === 0);

      const bin = d3.bin().thresholds(bins).value(d => d[feature]);

      const diedBins = bin(died);
      const survivedBins = bin(survived);

      new Chart(document.getElementById(canvasId), {
        type: "bar",
        data: {
          labels: diedBins.map(b => `${b.x0}-${b.x1}`),
          datasets: [
            {
              label: "Died",
              data: diedBins.map(b => b.length),
              backgroundColor: "#999"
            },
            {
              label: "Survived",
              data: survivedBins.map(b => b.length),
              backgroundColor: "#ccc"
            }
          ]
        },
        options: {
          plugins: { title: { display: true, text: title } },
          scales: { x: { stacked: true }, y: { stacked: true } }
        }
      });
    }

    binnedComparison("Age", 10, "Age Distribution (Missing Excluded)", "ageChart");
    binnedComparison("Fare", 10, "Fare Distribution", "fareChart");

    /* ======================
       4. CORRELATION
    ====================== */

    function encodeSex(s) { return s === "male" ? 1 : 0; }
    function encodeEmb(e) { return e === "S" ? 0 : e === "C" ? 1 : 2; }

    const corrData = data
      .filter(d => d.Age != null && d.Embarked != null)
      .map(d => ({
        Survived: d.Survived,
        Sex: encodeSex(d.Sex),
        Pclass: d.Pclass,
        Age: d.Age,
        Fare: d.Fare,
        SibSp: d.SibSp,
        Parch: d.Parch,
        Embarked: encodeEmb(d.Embarked)
      }));

    function corr(x, y) {
      return d3.correlation(corrData.map(d => d[x]), corrData.map(d => d[y]));
    }

    const features = ["Sex", "Pclass", "Age", "Fare", "SibSp", "Parch", "Embarked"];
    const corrTable = document.getElementById("correlation-table");
    corrTable.innerHTML = "<tr><th>Feature</th><th>Correlation with Survived</th></tr>";

    features.forEach(f => {
      corrTable.innerHTML +=
        `<tr><td>${f}</td><td>${corr("Survived", f).toFixed(3)}</td></tr>`;
    });
  });
