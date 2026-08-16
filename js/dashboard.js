/**
 * Staff System Control - Dashboard Analytics & Chart.js Visualizer
 */

class DashboardController {
  constructor() {
    this.chartInstances = {};
  }

  /**
   * Refresh all KPI metrics and charts
   */
  refresh() {
    const data = dataStore.getStaffData();
    this.updateMetricCards(data);
    this.renderCharts(data);
  }

  updateMetricCards(data) {
    let total = data.length;
    let active = 0, pending = 0, completed = 0, expired = 0, closed = 0, missing = 0;

    data.forEach(item => {
      const status = StatusCalculator.calculateStatus(item).key;
      if (status === 'active') active++;
      else if (status === 'pending') pending++;
      else if (status === 'completed') completed++;
      else if (status === 'expired') expired++;
      else if (status === 'closed') closed++;
      else if (status === 'missing') missing++;
    });

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('metric-total-staff', total);
    setVal('metric-active-staff', active);
    setVal('metric-pending-records', pending);
    setVal('metric-completed-records', completed);
    setVal('metric-expired-records', expired);
    setVal('metric-closed-records', closed);
    setVal('metric-missing-records', missing);
  }

  renderCharts(data) {
    if (typeof Chart === 'undefined') return;

    // 1. Department Distribution (Bar Chart)
    const deptCounts = {};
    data.forEach(item => {
      const d = item.department || 'មិនបានបញ្ជាក់ (Unassigned)';
      deptCounts[d] = (deptCounts[d] || 0) + 1;
    });

    const deptLabels = Object.keys(deptCounts);
    const deptValues = Object.values(deptCounts);
    this.createOrUpdateChart('chart-department', {
      type: 'bar',
      data: {
        labels: deptLabels,
        datasets: [{
          label: 'ចំនួនបុគ្គលិក (Staff Count)',
          data: deptValues,
          backgroundColor: 'rgba(37, 99, 235, 0.75)',
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { ticks: { maxRotation: 45, minRotation: 0 } }
        }
      }
    });

    // 2. Gender Ratio (Doughnut Chart)
    let male = 0, female = 0, otherG = 0;
    data.forEach(item => {
      if (item.gender === 'ប្រុស' || item.gender === 'Male') male++;
      else if (item.gender === 'ស្រី' || item.gender === 'Female') female++;
      else otherG++;
    });

    this.createOrUpdateChart('chart-gender', {
      type: 'doughnut',
      data: {
        labels: ['ប្រុស (Male)', 'ស្រី (Female)', 'ផ្សេងៗ (Other)'],
        datasets: [{
          data: [male, female, otherG],
          backgroundColor: ['#2563eb', '#ec4899', '#94a3b8'],
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // 3. Status Distribution (Pie Chart)
    let active = 0, pending = 0, completed = 0, expired = 0, closed = 0, missing = 0;
    data.forEach(item => {
      const s = StatusCalculator.calculateStatus(item).key;
      if (s === 'active') active++;
      else if (s === 'pending') pending++;
      else if (s === 'completed') completed++;
      else if (s === 'expired') expired++;
      else if (s === 'closed') closed++;
      else if (s === 'missing') missing++;
    });

    this.createOrUpdateChart('chart-status', {
      type: 'pie',
      data: {
        labels: [
          'សកម្ម (Active)',
          'រង់ចាំ (Pending)',
          'បានបញ្ចប់ (Completed)',
          'ផុតកំណត់ (Expired)',
          'បិទប្រព័ន្ធ (Closed)',
          'ខ្វះព័ត៌មាន (Missing)'
        ],
        datasets: [{
          data: [active, pending, completed, expired, closed, missing],
          backgroundColor: [
            '#059669', // emerald
            '#d97706', // amber
            '#2563eb', // blue
            '#dc2626', // rose
            '#4b5563', // slate
            '#9333ea'  // purple
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // 4. Staff by Year (Line Chart)
    const yearCounts = {};
    data.forEach(item => {
      const y = item.annualPeriod || (item.startDate ? item.startDate.slice(0, 4) : 'N/A');
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    const sortedYears = Object.keys(yearCounts).sort();
    const yearValues = sortedYears.map(y => yearCounts[y]);

    this.createOrUpdateChart('chart-year', {
      type: 'line',
      data: {
        labels: sortedYears,
        datasets: [{
          label: 'កំណត់ត្រាតាមឆ្នាំ (Records per Year)',
          data: yearValues,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  createOrUpdateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.chartInstances[canvasId]) {
      this.chartInstances[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    this.chartInstances[canvasId] = new Chart(ctx, config);
  }
}

const dashboardController = new DashboardController();
