// Global variables
let isMouseDown = false;
let selectMode = null; // true = selecting, false = deselecting
let selectAllMode = true; // true = select all, false = clear all

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeTimePicker();
    loadVenues();
    setupEventListeners();
});

function setupEventListeners() {
    document.querySelector('.check-btn').addEventListener('click', checkAvailability);
}

async function checkAvailability() {
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    // Get selected venue
    const venue = document.querySelector('input[name="venue"]:checked')?.value;

    // Get selected slots
    const slots = getSelectedSlots();

    // Show loader
    showSkeletonLoader(resultsDiv);

    try {
        // Send POST request
        const response = await fetch('/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venue, slots })
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.error);
            return;
        }

        const data = await response.json();
        
        // Remove loader and show results
        resultsDiv.innerHTML = '';
        renderResults(data, resultsDiv);
        
    } catch (error) {
        console.error('Error fetching availability:', error);
        alert('Failed to fetch availability data');
    }
}

function showSkeletonLoader(resultsDiv) {
    const skeletonGrid = document.createElement('div');
    skeletonGrid.className = 'results-grid';
    
    for (let i = 0; i < 7; i++) {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        
        const skeletonHeader = document.createElement('div');
        skeletonHeader.className = 'skeleton skeleton-header';
        card.appendChild(skeletonHeader);
        
        for (let j = 0; j < 4; j++) {
            const skeletonSlot = document.createElement('div');
            skeletonSlot.className = 'skeleton skeleton-slot';
            card.appendChild(skeletonSlot);
        }
        
        skeletonGrid.appendChild(card);
    }
    
    resultsDiv.appendChild(skeletonGrid);
}

function renderResults(data, resultsDiv) {
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'results-grid';
    
    data.forEach(day => {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        const dayHeader = document.createElement('h3');
        dayHeader.textContent = `${day.day_of_week} (${day.date})`;
        card.appendChild(dayHeader);
        
        const slotList = document.createElement('ul');
        day.slots.forEach(slot => {
            const slotItem = document.createElement('li');
            slotItem.textContent = `${slot.time} — ${slot.courts_available} courts available`;
            slotList.appendChild(slotItem);
        });
        
        card.appendChild(slotList);
        resultsGrid.appendChild(card);
    });
    
    resultsDiv.appendChild(resultsGrid);
}

function initializeTimePicker() {
    const timePicker = document.getElementById('timePicker');
    const days = 7;
    const hours = 23;

    // Create select all cell
    const selectAllCell = document.createElement('div');
    selectAllCell.id = 'selectAllCell';
    selectAllCell.style.cursor = 'pointer';
    selectAllCell.style.display = 'flex';
    selectAllCell.style.alignItems = 'center';
    selectAllCell.style.justifyContent = 'center';
    selectAllCell.classList.add('selectable-btn');
    selectAllCell.textContent = 'Select All';
    timePicker.appendChild(selectAllCell);

    // Create day headers
    for (let d = 0; d < days; d++) {
        const header = document.createElement('div');
        header.className = 'day-header col-select';
        header.textContent = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d];
        timePicker.appendChild(header);
    }

    // Create time grid
    for (let h = 6; h < hours; h++) {
        // Add time label
        const label = document.createElement('div');
        label.className = 'time-label row-select';
        label.textContent = `${String(h).padStart(2, '0')}:00`;
        timePicker.appendChild(label);

        // Add time cells for each day
        for (let d = 0; d < days; d++) {
            const cell = document.createElement('div');
            cell.className = 'time-cell';
            cell.dataset.day = d;
            cell.dataset.hour = h;
            timePicker.appendChild(cell);
        }
    }

    setupTimePickerEvents(timePicker, days, hours);
}

function setupTimePickerEvents(timePicker, days, hours) {
    // Mouse selection events
    timePicker.addEventListener('mousedown', e => {
        if (e.target.classList.contains('time-cell')) {
            isMouseDown = true;
            selectMode = !e.target.classList.contains('selected');
            e.target.classList.toggle('selected', selectMode);
            e.preventDefault();
        }
    });

    timePicker.addEventListener('mouseover', e => {
        if (isMouseDown && e.target.classList.contains('time-cell')) {
            e.target.classList.toggle('selected', selectMode);
        }
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    // Row selection (time labels)
    document.querySelectorAll('.row-select').forEach((label, h) => {
        label.addEventListener('click', () => {
            let allSelected = true;
            for (let d = 0; d < days; d++) {
                const cell = timePicker.querySelector(`.time-cell[data-day="${d}"][data-hour="${h + 6}"]`);
                if (cell && !cell.classList.contains('selected')) {
                    allSelected = false;
                }
            }
            for (let d = 0; d < days; d++) {
                const cell = timePicker.querySelector(`.time-cell[data-day="${d}"][data-hour="${h + 6}"]`);
                if (cell) cell.classList.toggle('selected', !allSelected);
            }
        });
    });

    // Column selection (day headers)
    document.querySelectorAll('.col-select').forEach((header, d) => {
        header.addEventListener('click', () => {
            let allSelected = true;
            for (let h = 6; h < hours; h++) {
                const cell = timePicker.querySelector(`.time-cell[data-day="${d}"][data-hour="${h}"]`);
                if (cell && !cell.classList.contains('selected')) {
                    allSelected = false;
                }
            }
            for (let h = 6; h < hours; h++) {
                const cell = timePicker.querySelector(`.time-cell[data-day="${d}"][data-hour="${h}"]`);
                if (cell) cell.classList.toggle('selected', !allSelected);
            }
        });
    });

    // Select all functionality
    document.getElementById('selectAllCell').addEventListener('click', () => {
        const allCells = timePicker.querySelectorAll('.time-cell');
        allCells.forEach(cell => {
            cell.classList.toggle('selected', selectAllMode);
        });
        // Toggle mode and button text
        selectAllMode = !selectAllMode;
        document.getElementById('selectAllCell').textContent = selectAllMode ? 'Select All' : 'Clear All';
    });
}

function getSelectedSlots() {
    const selectedCells = document.querySelectorAll('.time-cell.selected');
    const slots = [];
    selectedCells.forEach(cell => {
        slots.push({
            day: parseInt(cell.dataset.day, 10),
            hour: parseInt(cell.dataset.hour, 10)
        });
    });
    return slots;
}

async function loadVenues() {
    try {
        const response = await fetch('/venues');
        const venues = await response.json();
        const venueSection = document.getElementById('venue-selector');
        venueSection.innerHTML = '<label>Select Venue:</label>';
        
        venues.forEach(v => {
            const div = document.createElement('div');
            div.innerHTML = `<input type="radio" name="venue" value="${v.id}"> <span>${v.name}</span>`;
            venueSection.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading venues:', error);
        alert('Failed to load venues');
    }
}