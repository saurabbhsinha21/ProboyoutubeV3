let chart;
let chartData = [];
let chartLabels = [];
let tracking = false;
let interval;
let startTime;
let endTime;
let videoId = "";
let targetViews = 0;
let spikeStartTime;
let spikeIntervalMinutes = 5;
let apiKey = "AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8";

function startTracking() {
  clearInterval(interval);
  tracking = true;
  videoId = document.getElementById("videoId").value;
  targetViews = parseInt(document.getElementById("targetViews").value);
  const targetTimeString = document.getElementById("targetTime").value;
  const firstSpikeTimeString = document.getElementById("firstSpikeTime").value;
  spikeIntervalMinutes = parseInt(document.getElementById("spikeInterval").value);

  if (!targetTimeString || !firstSpikeTimeString) {
    alert("Please select both target and first spike times.");
    return;
  }

  startTime = new Date();
  endTime = new Date(targetTimeString);
  spikeStartTime = new Date(firstSpikeTimeString);

  if (!chart) initChart();

  updateStats();
  interval = setInterval(updateStats, 10000); // every 10 seconds
}

function initChart() {
  const ctx = document.getElementById("viewChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [{
        label: "Live Views",
        data: chartData,
        fill: false,
        borderColor: "blue",
        backgroundColor: "blue",
        tension: 0.3,
        pointRadius: 4
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

function updateStats() {
  fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      const viewCount = parseInt(data.items[0].statistics.viewCount);
      const currentTime = new Date();
      const timeLeftMinutes = Math.max(0, Math.floor((endTime - currentTime) / 60000));

      chartLabels.push(currentTime.toLocaleTimeString());
      chartData.push(viewCount);
      chart.update();

      const last5 = getViewsDiffByDataPoints(30);
      const last10 = getViewsDiffByDataPoints(60);
      const last15 = getViewsDiffByDataPoints(90);
      const last20 = getViewsDiffByDataPoints(120);
      const last25 = getViewsDiffByDataPoints(150);
      const last30 = getViewsDiffByDataPoints(180);
      const avg15 = last15 / 15;

      const viewsLeft = Math.max(0, targetViews - viewCount);
      const requiredRate = timeLeftMinutes > 0 ? viewsLeft / timeLeftMinutes : 0;
      const requiredNext5 = requiredRate * 5;
      const projectedViews = Math.floor(viewCount + (last5 / 5 * timeLeftMinutes));
      const forecast = projectedViews >= targetViews ? "Yes" : "No";

      document.getElementById("liveViews").innerText = viewCount.toLocaleString();
      document.getElementById("last5Min").innerText = `${last5.toLocaleString()} | ${(last5/1).toFixed(1)}`;
      document.getElementById("last10Min").innerText = `${last10.toLocaleString()} | ${(last10/2).toFixed(1)}`;
      document.getElementById("last15Min").innerText = `${last15.toLocaleString()} | ${(last15/3).toFixed(1)}`;
      document.getElementById("last20Min").innerText = `${last20.toLocaleString()} | ${(last20/4).toFixed(1)}`;
      document.getElementById("last25Min").innerText = `${last25.toLocaleString()} | ${(last25/5).toFixed(1)}`;
      document.getElementById("last30Min").innerText = `${last30.toLocaleString()} | ${(last30/6).toFixed(1)}`;
      document.getElementById("avg15Min").innerText = avg15.toFixed(2);
      document.getElementById("requiredRate").innerText = requiredRate.toFixed(2);
      document.getElementById("requiredNext5").innerText = Math.round(requiredNext5).toLocaleString();
      document.getElementById("projectedViews").innerText = projectedViews.toLocaleString();
      document.getElementById("forecast").innerText = forecast;
      document.getElementById("timeLeft").innerText = `${timeLeftMinutes}:${(60 - currentTime.getSeconds()).toString().padStart(2, "0")}`;

      const viewsLeftEl = document.getElementById("viewsLeft");
      viewsLeftEl.innerText = viewsLeft.toLocaleString();
      viewsLeftEl.classList.remove("green", "red", "neutral");
      viewsLeftEl.classList.add(forecast === "Yes" ? "green" : "red");

      updateSpikeList(currentTime, viewCount, viewsLeft);
      updateRiskMeter(avg15, requiredRate);
    })
    .catch(error => console.error("Error fetching YouTube data:", error));
}

function getViewsDiffByDataPoints(points) {
  const index = chartData.length - points;
  return index >= 0 ? chartData[chartData.length - 1] - chartData[index] : 0;
}

function updateSpikeList(currentTime, currentViews, viewsLeft) {
  const spikeList = document.getElementById("spikeList");
  spikeList.innerHTML = "";

  let spikeTime = new Date(spikeStartTime);
  const spikes = [];

  while (spikeTime <= endTime) {
    if (spikeTime >= currentTime) {
      spikes.push(new Date(spikeTime));
    }
    spikeTime.setMinutes(spikeTime.getMinutes() + spikeIntervalMinutes);
  }

  const viewsPerSpike = spikes.length > 0 ? Math.ceil(viewsLeft / spikes.length) : 0;

  spikes.forEach(spike => {
    const li = document.createElement("li");
    li.textContent = `${spike.toLocaleTimeString()} - ${viewsPerSpike.toLocaleString()} views required`;
    spikeList.appendChild(li);
  });
}

function updateRiskMeter(avg15, requiredRate) {
  let diffPercent = ((avg15 - requiredRate) / requiredRate) * 100;
  diffPercent = isFinite(diffPercent) ? diffPercent : 0;

  const bar = document.getElementById("riskBar");
  const label = document.getElementById("riskLabel");

  let color = "gray", status = "Unknown";

  const absDiff = Math.abs(diffPercent);

  if (absDiff <= 10) {
    status = "Very Risky";
    color = "red";
  } else if (absDiff <= 30) {
    status = "Risky";
    color = "orange";
  } else if (absDiff <= 50) {
    status = "Moderate";
    color = "yellow";
  } else if (absDiff <= 70) {
    status = "Safe";
    color = "lightgreen";
  } else if (absDiff <= 100) {
    status = "Very Safe";
    color = "green";
  } else {
    status = "Super Safe";
    color = "darkgreen";
  }

  // Ensure bar stays within 0-100%
  const barWidth = Math.min(Math.abs(diffPercent), 100);

  bar.style.width = `${barWidth}%`;
  bar.style.backgroundColor = color;
  label.innerHTML = `<strong>${status}</strong> (${diffPercent.toFixed(1)}%)`;
}

// ... keep existing declarations and functions ...

function updateStats() {
  fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      const viewCount = parseInt(data.items[0].statistics.viewCount);
      const currentTime = new Date();

      const timeLeftMinutes = Math.max(0, Math.floor((endTime - currentTime) / 60000));

      chartLabels.push(currentTime.toLocaleTimeString());
      chartData.push(viewCount);
      chart.update();

      const last5 = getViewDiff(30);
      const last10 = getViewDiff(60);
      const last15 = getViewDiff(90);
      const last20 = getViewDiff(120);
      const last25 = getViewDiff(150);
      const last30 = getViewDiff(180);
      const avg15 = last15 / 15;

      const viewsLeft = Math.max(0, targetViews - viewCount);
      const requiredRate = timeLeftMinutes > 0 ? viewsLeft / timeLeftMinutes : 0;
      const requiredNext5 = requiredRate * 5;
      const projectedViews = Math.floor(viewCount + (last5 / 5 * timeLeftMinutes));
      const forecast = projectedViews >= targetViews ? "Yes" : "No";

      document.getElementById("liveViews").innerText = viewCount.toLocaleString();
      document.getElementById("last5Min").innerText = last5.toLocaleString();
      document.getElementById("last10Min").innerText = last10.toLocaleString();
      document.getElementById("last15Min").innerText = last15.toLocaleString();
      document.getElementById("last20Min").innerText = last20.toLocaleString();
      document.getElementById("last25Min").innerText = last25.toLocaleString();
      document.getElementById("last30Min").innerText = last30.toLocaleString();
      document.getElementById("avg15Min").innerText = avg15.toFixed(2);
      document.getElementById("requiredRate").innerText = requiredRate.toFixed(2);
      document.getElementById("requiredNext5").innerText = Math.round(requiredNext5).toLocaleString();
      document.getElementById("projectedViews").innerText = projectedViews.toLocaleString();
      document.getElementById("forecast").innerText = forecast;
      document.getElementById("timeLeft").innerText = `${timeLeftMinutes}:${(60 - currentTime.getSeconds()).toString().padStart(2, "0")}`;

      const viewsLeftEl = document.getElementById("viewsLeft");
      viewsLeftEl.innerText = viewsLeft.toLocaleString();
      viewsLeftEl.className = forecast === "Yes" ? "green" : "red";

      updateSpikeList(currentTime, viewCount, viewsLeft);
      updateRiskMeter(avg15, requiredRate);
    })
    .catch(error => console.error("Error fetching YouTube data:", error));
}

function getViewDiff(pointsBack) {
  const idx = chartData.length - pointsBack;
  return idx >= 0 ? chartData[chartData.length - 1] - chartData[idx] : 0;
}

function updateRiskMeter(avgRate, requiredRate) {
  if (requiredRate === 0) {
    document.getElementById("riskText").innerText = "Super Safe (∞%)";
    document.getElementById("riskBarFill").style.width = "100%";
    document.getElementById("riskBarFill").style.backgroundColor = "green";
    return;
  }

  const percentage = (avgRate / requiredRate) * 100;
  const fill = Math.min(percentage, 100);
  let text = "";
  let color = "";

  if (percentage <= 10) {
    text = `Very Risky (${percentage.toFixed(1)}%)`;
    color = "red";
  } else if (percentage <= 30) {
    text = `Risky (${percentage.toFixed(1)}%)`;
    color = "orange";
  } else if (percentage <= 50) {
    text = `Moderate (${percentage.toFixed(1)}%)`;
    color = "gold";
  } else if (percentage <= 70) {
    text = `Safe (${percentage.toFixed(1)}%)`;
    color = "lightgreen";
  } else if (percentage <= 100) {
    text = `Very Safe (${percentage.toFixed(1)}%)`;
    color = "green";
  } else {
    text = `Super Safe (${percentage.toFixed(1)}%)`;
    color = "darkgreen";
  }

  document.getElementById("riskText").innerText = text;
  const bar = document.getElementById("riskBarFill");
  bar.style.width = `${fill}%`;
  bar.style.backgroundColor = color;
}
