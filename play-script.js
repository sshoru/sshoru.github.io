// Simple script for Play mode pages (art.html, writeups.html)
document.addEventListener('DOMContentLoaded', function() {
    // Ensure we're in play mode
    document.body.classList.remove('work-mode');
    document.body.classList.add('play-mode');

    // No mode switching on these pages - they're already in play mode

    // Add hover effects to art items
    const artItems = document.querySelectorAll('.art-item');
    artItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });

        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
    });

    // Add hover effects to writeup cards
    const writeupCards = document.querySelectorAll('.writeup-card');
    writeupCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
    });
});
