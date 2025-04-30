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

  if (!chart) {
    initChart();
  }

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

      const getDiff = minutes => {
        const index = chartData.length - (minutes * 6);
        return index >= 0 ? viewCount - chartData[index] : 0;
      };

      const last5 = getDiff(5);
      const last10 = getDiff(10);
      const last15 = getDiff(15);
      const last20 = getDiff(20);
      const last25 = getDiff(25);
      const last30 = getDiff(30);

      const avg5 = last5 / 5;
      const avg10 = last10 / 10;
      const avg15 = last15 / 15;
      const avg20 = last20 / 20;
      const avg25 = last25 / 25;
      const avg30 = last30 / 30;

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

      document.getElementById("avg5Min").innerText = avg5.toFixed(2);
      document.getElementById("avg10Min").innerText = avg10.toFixed(2);
      document.getElementById("avg15Min").innerText = avg15.toFixed(2);
      document.getElementById("avg20Min").innerText = avg20.toFixed(2);
      document.getElementById("avg25Min").innerText = avg25.toFixed(2);
      document.getElementById("avg30Min").innerText = avg30.toFixed(2);

      document.getElementById("requiredRate").innerText = requiredRate.toFixed(2);
      document.getElementById("requiredNext5").innerText = Math.round(requiredNext5).toLocaleString();
      document.getElementById("projectedViews").innerText = projectedViews.toLocaleString();
      document.getElementById("forecast").innerText = forecast;

      const timeLeftString = `${timeLeftMinutes}:${(60 - currentTime.getSeconds()).toString().padStart(2, "0")}`;
      document.getElementById("timeLeft").innerText = timeLeftString;

      const viewsLeftEl = document.getElementById("viewsLeft");
      viewsLeftEl.innerText = viewsLeft.toLocaleString();
      viewsLeftEl.classList.remove("green", "red", "neutral");
      viewsLeftEl.classList.add(forecast === "Yes" ? "green" : "red");

      // Risk Meter
      const riskPercent = avg15 / requiredRate;
      let riskLabel = "Unknown";
      let riskColor = "black";

      if (riskPercent <= 1.1) {
        riskLabel = "Very Risky";
        riskColor = "darkred";
      } else if (riskPercent <= 1.3) {
        riskLabel = "Risky";
        riskColor = "orange";
      } else if (riskPercent <= 1.5) {
        riskLabel = "Moderate";
        riskColor = "gold";
      } else if (riskPercent <= 1.7) {
        riskLabel = "Safe";
        riskColor = "lightgreen";
      } else if (riskPercent <= 2.0) {
        riskLabel = "Very Safe";
        riskColor = "green";
      } else {
        riskLabel = "Super Safe";
        riskColor = "darkgreen";
      }

      const riskMeter = document.getElementById("riskMeter");
      riskMeter.innerText = `${riskLabel} (${(riskPercent * 100).toFixed(1)}%)`;
      riskMeter.style.color = riskColor;

      updateSpikeList(currentTime, viewCount, viewsLeft);
    })
    .catch(error => {
      console.error("Error fetching YouTube data:", error);
    });
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
