
function updateClock() {
  const clock = document.getElementById("clock");

  if (clock) {
    clock.textContent = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium"
    });
  }
}

updateClock();
setInterval(updateClock, 1000);


// Sidebar navigation
document.addEventListener("DOMContentLoaded", () => {

  const navItems = document.querySelectorAll(".sidebar a[href^='#']");

  navItems.forEach((item) => {

    item.addEventListener("click", () => {

      navItems.forEach((nav) => {
        nav.classList.remove("active");
      });

      item.classList.add("active");

    });

  });

});
