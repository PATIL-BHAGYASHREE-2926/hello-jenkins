
function updateClock() {
  const clock = document.getElementById("clock");

  clock.textContent = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium"
  });
}

updateClock();
setInterval(updateClock, 1000);
