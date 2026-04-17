document.addEventListener('DOMContentLoaded', function() {
    
    // ========== CARROUSEL PRINCIPAL (AUTO) ==========
    const principalCarousel = document.querySelector('.carousel-image-principal');
    const principalImages = document.querySelectorAll('.carousel-image-principal img');
    const principalDotsContainer = document.querySelector('.carousel-dots-principal');
    
    let currentIndex = 0;
    let totalImages = principalImages.length;
    let autoSlideInterval;
    
    if (principalCarousel && totalImages > 0) {
        
        function updatePrincipalCarousel() {
            const offset = -currentIndex * 100;
            principalCarousel.style.transform = `translateX(${offset}%)`;
            updatePrincipalDots();
        }
        
        function createPrincipalDots() {
            if (!principalDotsContainer) return;
            principalDotsContainer.innerHTML = '';
            for (let i = 0; i < totalImages; i++) {
                const dot = document.createElement('span');
                dot.classList.add('dot');
                if (i === currentIndex) dot.classList.add('active');
                dot.addEventListener('click', () => {
                    stopAutoSlide();
                    currentIndex = i;
                    updatePrincipalCarousel();
                    startAutoSlide();
                });
                principalDotsContainer.appendChild(dot);
            }
        }
        
        function updatePrincipalDots() {
            const dots = document.querySelectorAll('.carousel-dots-principal .dot');
            dots.forEach((dot, i) => {
                if (i === currentIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
        
        function nextPrincipalSlide() {
            currentIndex = (currentIndex + 1) % totalImages;
            updatePrincipalCarousel();
        }
        
        function startAutoSlide() {
            if (autoSlideInterval) clearInterval(autoSlideInterval);
            autoSlideInterval = setInterval(nextPrincipalSlide, 1800);
        }
        
        function stopAutoSlide() {
            if (autoSlideInterval) clearInterval(autoSlideInterval);
        }
        
        principalCarousel.style.display = 'flex';
        principalCarousel.style.transition = 'transform 0.5s ease-in-out';
        createPrincipalDots();
        startAutoSlide();
        
        const container = document.querySelector('.carousel-container-principal');
        if (container) {
            container.addEventListener('mouseenter', stopAutoSlide);
            container.addEventListener('mouseleave', startAutoSlide);
        }
    }
    
    // ========== MINI CARROUSELS (MANUELS) ==========
    const miniCarousels = document.querySelectorAll('.mini-carousel');
    
    miniCarousels.forEach(carousel => {
        const slidesContainer = carousel.querySelector('.slides');
        const images = carousel.querySelectorAll('.slides img');
        const prevBtn = carousel.querySelector('.mini-prev');
        const nextBtn = carousel.querySelector('.mini-next');
        let currentImageIndex = 0;
        const totalImagesCount = images.length;
        
        if (slidesContainer && totalImagesCount > 0) {
            
            function updateMiniCarousel() {
                const offset = -currentImageIndex * 100;
                slidesContainer.style.transform = 'translateX(' + offset + '%)';
            }
            
            if (prevBtn) {
                prevBtn.addEventListener('click', function() {
                    currentImageIndex = (currentImageIndex - 1 + totalImagesCount) % totalImagesCount;
                    updateMiniCarousel();
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', function() {
                    currentImageIndex = (currentImageIndex + 1) % totalImagesCount;
                    updateMiniCarousel();
                });
            }
            
            slidesContainer.style.display = 'flex';
            slidesContainer.style.transition = 'transform 0.1s ease-in-out';
            updateMiniCarousel();
        }
    });
});