fetch("train.csv")
  .then(r => r.text())
  .then(text => {
    const data = d3.csvParse(text, d3.autoType);

    /* =======================
       1. DATA OVERVIEW
    ======================= */
    d3.select("#dataset-info").html(
      `<strong>Rows:</strong> ${data.length} |
       <strong>Columns:</strong> ${Object.keys(data[0]).length}`
    );

    // Missing values table
    const missing = Object.keys(data[0]).map(col => ({
      col,
      count: data.filter(d => d[col] === null || d[col] === "").length
    }));

    const mt = d3.select("#missing-table");
    mt.append("tr").html("<th>Feature</th><th>Missing Count</th>");
    missing.forEach(d =>
      mt.append("tr").html(`<td>${d.col}</td><td>${d.count}</td>`)
    );

    // Preview table
    const pt = d3.select("#preview-table");
    pt.append("tr")
      .selectAll("th")
      .data(Object.keys(data[0]))
      .enter()
      .append("th")
      .text(d => d);

    data.slice(0, 5).forEach(row => {
      pt.append("tr")
        .selectAll("td")
        .data(Object.values(row))
        .enter()
        .append("td")
        .text(d => d);
    });

    /* =======================
       2. DEATH RATE BY CATEGORY
    ======================= */
    function deathRateChart(canvasId, field, title) {
      const grouped = d3.group(data, d => d[field] ?? "Missing");
      const labels = [];
      const rates = [];

      grouped.forEach((v, k) => {
        labels.push(k);
        rates.push(
          v.filter(d => d.Survived === 0).length / v.length
        );
      });

      new Chart(document.getElementById(canvasId), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Death Rate",
            data: rates,
            backgroundColor: "#4c78a8"
          }]
        },
        options: {
          plugins: { title: { display: true, text: title } },
          scales: { y: { min: 0, max: 1 } }
        }
      });
    }

    deathRateChart("sexChart", "Sex", "Death Rate by Sex");
    deathRateChart("classChart", "Pclass", "Death Rate by Class");
    deathRateChart("embarkedChart", "Embarked", "Death Rate by Embarked");
    deathRateChart("sibspChart", "SibSp", "Death Rate by SibSp");
    deathRateChart("parchChart", "Parch", "Death Rate by Parch");

    /* =======================
       3. NUMERICAL FEATURES
    ======================= */
    function numericChart(canvasId, field, title, filterMissing) {
      const filtered = filterMissing
        ? data.filter(d => d[field] !== null)
        : data;

      const surv0 = filtered.filter(d => d.Survived === 0).map(d => d[field]);
      const surv1 = filtered.filter(d => d.Survived === 1).map(d => d[field]);

      new Chart(document.getElementById(canvasId), {
        type: "histogram",
        data: {
          datasets: [
            { label: "Died", data: surv0, backgroundColor: "#e45756" },
            { label: "Survived", data: surv1, backgroundColor: "#72b7b2" }
          ]
        },
        options: {
          plugins: { title: { display: true, text: title } }
        }
      });
    }

    numericChart("ageChart", "Age", "Age Distribution (Missing Excluded)", true);
    numericChart("fareChart", "Fare", "Fare Distribution", false);

    /* =======================
       4. CORRELATION
    ======================= */
    const encode = d => ({
      Survived: d.Survived,
      Sex: d.Sex === "male" ? 1 : 0,
      Pclass: d.Pclass,
      Age: d.Age,
      Fare: d.Fare,
      Embarked:
        d.Embarked === "S" ? 0 :
        d.Embarked === "C" ? 1 :
        d.Embarked === "Q" ? 2 : null
    });

    const encoded = data.map(encode);

    function pearson(x, y) {
      const valid = x.map((d, i) => [d, y[i]])
        .filter(d => d[0] !== null && d[1] !== null);
      const xs = valid.map(d => d[0]);
      const ys = valid.map(d => d[1]);
      const mx = d3.mean(xs), my = d3.mean(ys);
      return d3.sum(xs.map((d, i) =>
        (d - mx) * (ys[i] - my)
      )) /
      Math.sqrt(
        d3.sum(xs.map(d => (d - mx) ** 2)) *
        d3.sum(ys.map(d => (d - my) ** 2))
      );
    }

    const features = ["Sex", "Pclass", "Age", "Fare", "Embarked"];
    const corrs = features.map(f => ({
      feature: f,
      corr: pearson(
        encoded.map(d => d[f]),
        encoded.map(d => d.Survived)
      )
    }));

    const ct = d3.select("#correlation-table");
    ct.append("tr").html("<th>Feature</th><th>Correlation</th>");
    corrs.forEach(d =>
      ct.append("tr").html(
        `<td>${d.feature}</td><td>${d.corr.toFixed(3)}</td>`
      )
    );

    /* Heatmap */
    const svg = d3.select("#heatmap");
    const scale = d3.scaleLinear().domain([-1, 1]).range(["#d73027", "#1a9850"]);

    corrs.forEach((d, i) => {
      svg.append("rect")
        .attr("x", 150)
        .attr("y", i * 50 + 30)
        .attr("width", 200)
        .attr("height", 40)
        .attr("fill", scale(d.corr));

      svg.append("text")
        .attr("x", 10)
        .attr("y", i * 50 + 55)
        .text(d.feature);

      svg.append("text")
        .attr("x", 260)
        .attr("y", i * 50 + 55)
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .text(d.corr.toFixed(2));
    });
  });
