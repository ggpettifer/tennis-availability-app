// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
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

    // Show loader
    showSkeletonLoader(resultsDiv);

    try {
        // Send POST request
        const response = await fetch('/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venue })
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
    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'results-scroll';
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
    
    scrollWrapper.appendChild(skeletonGrid);
    resultsDiv.appendChild(scrollWrapper);
}

function renderResults(data, resultsDiv) {
    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'results-scroll';
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
    
    // Generate complete 7-day range starting from today
    const today = new Date();
    const fullWeekData = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        const dayOfWeek = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust for Monday start
        
        // Find existing data for this date or create empty entry
        const existingDay = data.find(d => d.date === dateStr);
        fullWeekData.push({
            date: dateStr,
            day_of_week: dayOfWeek,
            slots: existingDay ? existingDay.slots : []
        });
    }
    
    // Create empty corner cell
    const cornerCell = document.createElement('div');
    cornerCell.className = 'results-empty-corner';
    resultsGrid.appendChild(cornerCell);
    
    // Create day headers for all 7 days
    fullWeekData.forEach((day, index) => {
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
        
        // Add cells for all 7 days
        fullWeekData.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'results-cell';
            
            const courtsAvailable = availabilityMap[day.date] && availabilityMap[day.date][hour];
            if (courtsAvailable && courtsAvailable > 0) {
                cell.classList.add('available');
                cell.textContent = courtsAvailable;
            } else {
                cell.classList.add('empty');
            }
            
            resultsGrid.appendChild(cell);
        });
    }
    
    scrollWrapper.appendChild(resultsGrid);
    resultsDiv.appendChild(scrollWrapper);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
        
        // Add first 3 venues (always visible)
        venues.slice(0, 3).forEach(v => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="radio" name="venue" value="${v.id}"></td>
                <td class="venue-name"><a href="${v.url}" target="_blank" rel="noopener noreferrer">${v.name}</a></td>
                <td class="court-count">${v.numberOfCourts || 'N/A'}</td>
                <td class="price">£${v.pricePerHour ? v.pricePerHour.toFixed(2) : 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Add remaining venues (initially hidden)
        venues.slice(3).forEach(v => {
            const row = document.createElement('tr');
            row.className = 'venue-row-hidden';
            row.style.display = 'none';
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
        
        // Add expand/collapse button below table (only if there are more than 3 venues)
        if (venues.length > 3) {
            const toggleButton = document.createElement('button');
            toggleButton.id = 'venue-toggle-btn';
            toggleButton.className = 'venue-toggle-btn';
            toggleButton.textContent = `See more venues (${venues.length - 3} more)`;
            venueSection.appendChild(toggleButton);
            
            // Setup toggle functionality
            setupVenueToggle(venues.length);
        }
        
    } catch (error) {
        console.error('Error loading venues:', error);
        alert('Failed to load venues');
    }
}

function setupVenueToggle(totalVenues) {
    const toggleBtn = document.getElementById('venue-toggle-btn');
    let expanded = false;
    
    toggleBtn.addEventListener('click', () => {
        const hiddenRows = document.querySelectorAll('.venue-row-hidden');
        
        if (expanded) {
            // Hide additional venues
            hiddenRows.forEach(row => {
                row.style.display = 'none';
            });
            toggleBtn.textContent = `See more venues (${totalVenues - 3} more)`;
            expanded = false;
        } else {
            // Show all venues
            hiddenRows.forEach(row => {
                row.style.display = 'table-row';
            });
            toggleBtn.textContent = 'Hide';
            expanded = true;
        }
    });
}