fetch("train.csv")
  .then(r => r.text())
  .then(text => {
    const data = d3.csvParse(text);

    // ---------- 1. Data Overview ----------
    document.getElementById("dimensions").innerHTML =
      `<strong>Rows:</strong> ${data.length}, <strong>Columns:</strong> ${Object.keys(data[0]).length}`;

    const missingTable = document.getElementById("missing-table");
    missingTable.innerHTML = "<tr><th>Feature</th><th>Missing</th></tr>";
    Object.keys(data[0]).forEach(col => {
      const miss = data.filter(d => d[col] === "").length;
      missingTable.innerHTML += `<tr><td>${col}</td><td>${miss}</td></tr>`;
    });

    const preview = document.getElementById("preview-table");
    preview.innerHTML =
      "<tr>" + Object.keys(data[0]).map(c => `<th>${c}</th>`).join("") + "</tr>";
    data.slice(0,5).forEach(row => {
      preview.innerHTML +=
        "<tr>" + Object.values(row).map(v => `<td>${v}</td>`).join("") + "</tr>";
    });

    // ---------- Helpers ----------
    const deathRate = (arr) =>
      arr.filter(d => d.Survived === "0").length / arr.length;

    function catChart(canvas, feature, title) {
      const groups = d3.group(data, d => d[feature] || "Missing");
      new Chart(document.getElementById(canvas), {
        type: "bar",
        data: {
          labels: [...groups.keys()],
          datasets: [{
            label: "Death Rate",
            data: [...groups.values()].map(deathRate),
            backgroundColor: "#5b8def"
          }]
        },
        options: {
          plugins: { title: { display: true, text: title }},
          scales: { y: { min: 0, max: 1 }}
        }
      });
    }

    // ---------- 2. Categorical ----------
    catChart("sexChart", "Sex", "Death Rate by Sex");
    catChart("classChart", "Pclass", "Death Rate by Class");
    catChart("embarkedChart", "Embarked", "Death Rate by Embarked");
    catChart("sibspChart", "SibSp", "Death Rate by SibSp");
    catChart("parchChart", "Parch", "Death Rate by Parch");

    // ---------- 3. Numerical ----------
    function numChart(canvas, feature, title, filterFn) {
      const surv0 = data.filter(d => d.Survived === "0").filter(filterFn);
      const surv1 = data.filter(d => d.Survived === "1").filter(filterFn);

      new Chart(document.getElementById(canvas), {
        type: "bar",
        data: {
          labels: ["Died", "Survived"],
          datasets: [{
            label: `Mean ${feature}`,
            data: [
              d3.mean(surv0, d => +d[feature]),
              d3.mean(surv1, d => +d[feature])
            ],
            backgroundColor: ["#d9534f", "#5cb85c"]
          }]
        },
        options: {
          plugins: { title: { display: true, text: title }}
        }
      });
    }

    numChart("ageChart", "Age", "Mean Age (Age Missing Excluded)", d => d.Age !== "");
    numChart("fareChart", "Fare", "Mean Fare", _ => true);

    // ---------- 4. Correlation ----------
    const encode = d => ({
      Survived: +d.Survived,
      Sex: d.Sex === "male" ? 1 : 0,
      Pclass: +d.Pclass,
      Age: d.Age === "" ? null : +d.Age,
      SibSp: +d.SibSp,
      Parch: +d.Parch,
      Fare: +d.Fare,
      Embarked: d.Embarked === "S" ? 0 : d.Embarked === "C" ? 1 : d.Embarked === "Q" ? 2 : null
    });

    const enc = data.map(encode);

    function corr(x, y) {
      const f = enc.filter(d => d[x] != null && d[y] != null);
      return d3.correlation(f, d => d[x], d => d[y]);
    }

    const features = ["Sex","Pclass","Age","SibSp","Parch","Fare","Embarked"];
    const corrTable = document.getElementById("corr-table");
    corrTable.innerHTML = "<tr><th>Feature</th><th>Corr with Survived</th></tr>";
    features.forEach(f => {
      corrTable.innerHTML += `<tr><td>${f}</td><td>${corr(f,"Survived").toFixed(3)}</td></tr>`;
    });

    // Heatmap
    const all = ["Survived", ...features];
    const size = 60;
    const svg = d3.select("#heatmap");
    const scale = d3.scaleLinear().domain([-1,1]).range(["#d73027","#1a9850"]);

    all.forEach((a,i) => {
      all.forEach((b,j) => {
        svg.append("rect")
          .attr("x", j*size + 80)
          .attr("y", i*size + 20)
          .attr("width", size)
          .attr("height", size)
          .attr("fill", scale(corr(a,b) || 0));
      });
    });

    svg.selectAll("text.labelX")
      .data(all)
      .enter()
      .append("text")
      .attr("x",(d,i)=>i*size+110)
      .attr("y",15)
      .attr("text-anchor","end")
      .attr("transform",(d,i)=>`rotate(-45,${i*size+110},15)`)
      .text(d=>d);

    svg.selectAll("text.labelY")
      .data(all)
      .enter()
      .append("text")
      .attr("x",10)
      .attr("y",(d,i)=>i*size+55)
      .text(d=>d);
  });
