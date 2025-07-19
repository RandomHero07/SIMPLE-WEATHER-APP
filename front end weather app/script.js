let tempChart, precipChart, windChart, dummyChart;
document.getElementById('cityInput').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    document.getElementById('getWeatherBtn').click();
  }
});
document.addEventListener('DOMContentLoaded', () => {
    const showBtn = document.getElementById('showContainer');
    const container = document.getElementById('container');
    const top = document.getElementById('top');
    container.style.display = 'none';

    showBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
            top.style.display = 'none';
        }, 500);
    });
});
document.getElementById('getWeatherBtn').addEventListener('click', async () => {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) return alert('Please enter a city name.');

    if (dummyChart) {
        dummyChart.destroy();
        dummyChart = null;
    }
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}`);
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) return alert("City not found");

        const { latitude, longitude, name, country } = geoData.results[0];

        const weatherRes = await fetch(
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,windspeed_10m,winddirection_10m,relative_humidity_2m,cloudcover,uv_index,apparent_temperature,surface_pressure,visibility&past_days=7&forecast_days=7&timezone=auto`
);
        const data = await weatherRes.json();
        const hours = data.hourly.time.map(t => new Date(t));
        const temp = data.hourly.temperature_2m;
        const precip = data.hourly.precipitation;
        const windSpeed = data.hourly.windspeed_10m;
        const windDir = data.hourly.winddirection_10m;
        const humidity = data.hourly.relative_humidity_2m.at(-1);
        const cloud = data.hourly.cloudcover.at(-1);
        const feelsLike = data.hourly.apparent_temperature.at(-1);
        const uv = data.hourly.uv_index.at(-1);
        const pressure = data.hourly.surface_pressure.at(-1);
        const visibility = data.hourly.visibility.at(-1);
       document.getElementById("weatherInfo").innerHTML = `
  <strong>${name}, ${country}</strong><br>
  Temperature: ${temp.at(-1)} °C<br>
  Feels Like: ${feelsLike} °C<br>
  Humidity: ${humidity}%<br>
  Cloud Cover: ${cloud}%<br>
  UV Index: ${uv}<br>
  Visibility: ${visibility} m<br>
  Pressure: ${pressure} hPa<br>
  Wind Speed: ${windSpeed.at(-1)} km/h<br>
  Wind Direction: ${windDir.at(-1)}°
`;
        document.getElementById("charts").style.display = "block";
        drawChart('tempChart', 'Temperature (\u00b0C)', hours, temp, 'red');
        drawChart('precipChart', 'Precipitation (mm)', hours, precip, 'blue');
        drawWindChart('windChart', hours, windSpeed, windDir);
        fetchAQI(latitude, longitude);
    } catch (error) {
        console.error("Error fetching weather:", error);
        alert("Failed to load weather data.");
    }
});
function drawChart(canvasId, label, labels, data, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (canvasId === 'tempChart' && tempChart) tempChart.destroy();
    if (canvasId === 'precipChart' && precipChart) precipChart.destroy();
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data,
                borderColor: color,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { type: 'time', time: { unit: 'day' } },
                y: { beginAtZero: true }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });

    if (canvasId === 'tempChart') tempChart = chart;
    if (canvasId === 'precipChart') precipChart = chart;
}

function drawWindChart(canvasId, labels, speed, direction) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (windChart) windChart.destroy();

    windChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Wind Speed (km/h)', data: speed, borderColor: 'white', fill: false },
                { label: 'Wind Direction (°)', data: direction, borderColor: 'pink', fill: false, yAxisID: 'dir' }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { type: 'time', time: { unit: 'day' } },
                y: { beginAtZero: true },
                dir: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 360,
                    ticks: { stepSize: 90 }
                }
            }
        }
    });
}

function drawAQIGauge(aqi) {
    const canvas = document.getElementById('aqiGauge');
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 250;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.9;
    const radius = 100;

    const zones = [
        { from: 0, to: 30, color: 'green' },
        { from: 31, to: 60, color: 'yellow' },
        { from: 61, to: 85, color: 'orange' },
        { from: 86, to: 105, color: 'red' },
        { from: 106, to: 160, color: 'purple' }
    ];

    zones.forEach(zone => {
        const startAngle = Math.PI + (zone.from / 160) * Math.PI;
        const endAngle = Math.PI + (zone.to / 160) * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 20;
        ctx.stroke();
    });
    const angle = Math.PI + (aqi / 160) * Math.PI;
    const needleX = centerX + radius * Math.cos(angle);
    const needleY = centerY + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.fillText(`AQI = ${aqi}`, centerX, centerY - 20);

    ctx.fillStyle = '#000';
    ctx.font = '18px Arial';
    ctx.fillText(`AQI: ${aqi}`, centerX, centerY - radius - 25);
}

function fetchAQI(lat, lon) {
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi`;

    fetch(aqiUrl)
        .then(res => res.json())
        .then(data => {
            const aqi = data.hourly.us_aqi[0];
            drawAQIGauge(aqi);
            document.getElementById("container").classList.remove("initial");

        })
        .catch(err => {
            console.warn("Failed to load AQI data:", err);
        });
}

