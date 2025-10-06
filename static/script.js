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
    skeletonGrid.className = 'results-time-grid';
    
    // Create skeleton corner cell
    const cornerCell = document.createElement('div');
    cornerCell.className = 'results-empty-corner skeleton';
    skeletonGrid.appendChild(cornerCell);
    
    // Create skeleton day headers
    for (let i = 0; i < 7; i++) {
        const header = document.createElement('div');
        header.className = 'results-day-header skeleton';
        skeletonGrid.appendChild(header);
    }
    
    // Create skeleton time rows
    for (let hour = 6; hour < 23; hour++) {
        // Add skeleton time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'results-time-label skeleton';
        skeletonGrid.appendChild(timeLabel);
        
        // Add skeleton cells for each day
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('div');
            cell.className = 'results-cell skeleton';
            skeletonGrid.appendChild(cell);
        }
    }
    
    resultsDiv.appendChild(skeletonGrid);
}

function renderResults(data, resultsDiv) {
    // Create a time-grid similar to the time picker
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'results-time-grid';
    
    // Create data structure for easy lookup
    const availabilityMap = {};
    data.forEach(day => {
        availabilityMap[day.date] = {};
        day.slots.forEach(slot => {
            const hour = parseInt(slot.time.split(':')[0]);
            availabilityMap[day.date][hour] = slot.courts_available;
        });
    });
    
    // Get the date range from the data (should be consecutive days starting from today)
    const dates = data.map(d => d.date).sort();
    const dayNames = data.map(d => d.day_of_week);
    
    // Create empty corner cell
    const cornerCell = document.createElement('div');
    cornerCell.className = 'results-empty-corner';
    resultsGrid.appendChild(cornerCell);
    
    // Create day headers
    data.forEach((day, index) => {
        const header = document.createElement('div');
        header.className = 'results-day-header';
        
        const dayName = document.createElement('div');
        dayName.className = 'day-name';
        const dayText = day.day_of_week.substring(0, 3); // Mon, Tue, etc.
        dayName.textContent = index === 0 ? `${dayText} (today)` : dayText;
        
        const dayDate = document.createElement('div');
        dayDate.className = 'day-date';
        dayDate.textContent = formatDate(day.date);
        
        header.appendChild(dayName);
        header.appendChild(dayDate);
        resultsGrid.appendChild(header);
    });
    
    // Create time rows (6 AM to 10 PM, matching the time picker)
    for (let hour = 6; hour < 23; hour++) {
        // Add time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'results-time-label';
        timeLabel.textContent = `${String(hour).padStart(2, '0')}:00`;
        resultsGrid.appendChild(timeLabel);
        
        // Add cells for each day
        data.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'results-cell';
            
            const courtsAvailable = availabilityMap[day.date][hour];
            if (courtsAvailable && courtsAvailable > 0) {
                cell.classList.add('available');
                cell.textContent = courtsAvailable;
            } else {
                cell.classList.add('empty');
            }
            
            resultsGrid.appendChild(cell);
        });
    }
    
    resultsDiv.appendChild(resultsGrid);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
        
        // Create table
        const table = document.createElement('table');
        table.className = 'venue-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Select</th>
            <th>Venue</th>
            <th>Courts</th>
            <th>Price/Hour</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        venues.forEach(v => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="radio" name="venue" value="${v.id}"></td>
                <td class="venue-name"><a href="${v.url}" target="_blank" rel="noopener noreferrer">${v.name}</a></td>
                <td class="court-count">${v.numberOfCourts || 'N/A'}</td>
                <td class="price">£${v.pricePerHour ? v.pricePerHour.toFixed(2) : 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        venueSection.appendChild(table);
    } catch (error) {
        console.error('Error loading venues:', error);
        alert('Failed to load venues');
    }
}