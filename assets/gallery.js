// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for gallery
    const gallery = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");

    // CONFIG — CHANGE THESE
    const username = "vflower69";
    const repo = "jts";
    const branch = "main"; // or "master"
    const folderPath = "images";

    async function loadImages() {
      const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${folderPath}?ref=${branch}`;

      try {
        const response = await fetch(apiUrl);
        const files = await response.json();

        const imageFiles = files.filter(file =>
          /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)
        );

        imageFiles.forEach(file => {
          const imgUrl = `https://${username}.github.io/${repo}/${folderPath}/${file.name}`;

          const item = document.createElement("div");
          item.className = "gallery-item";

          const img = document.createElement("img");
          img.src = imgUrl;
          img.alt = file.name;

          img.addEventListener("click", () => {
            lightboxImg.src = imgUrl;
            lightbox.style.display = "flex";
          });

          item.appendChild(img);
          gallery.appendChild(item);
        });

      } catch (err) {
        gallery.innerHTML = "<p style='text-align:center;color:#f87171;'>Failed to load images.</p>";
        console.error(err);
      }
    }

    lightbox.addEventListener("click", () => {
      lightbox.style.display = "none";
    });

    loadImages();
