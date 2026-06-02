document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化 Chart.js
    fetch('/api/clothes')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('clothesChart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: '衣物數量',
                        data: data.data,
                        backgroundColor: [
                            '#2b6cb0', // Primary Blue
                            '#4a5568', // Secondary Gray
                            '#e2e8f0', // Light Gray
                            '#718096', // Muted Gray
                            '#2c5282', // Darker Blue
                            '#a0aec0'  // Mid Gray
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    family: "'Noto Sans TC', sans-serif"
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error fetching clothes data:', error));

    // 2. 按鈕操作與 Toast 通知
    const btnDehumidify = document.getElementById('btn-dehumidify');
    const btnUvc = document.getElementById('btn-uvc');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    if (btnDehumidify) {
        btnDehumidify.addEventListener('click', () => {
            fetch('/api/action/dehumidify', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    showToast(data.message);
                });
        });
    }

    if (btnUvc) {
        btnUvc.addEventListener('click', () => {
            fetch('/api/action/uvc', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    showToast(data.message);
                    document.getElementById('val-uvc').textContent = 'ON';
                    document.getElementById('val-uvc').style.color = '#e53e3e'; // Red for warning
                });
        });
    }

    // 3. 搜尋功能 (前端簡易過濾模擬)
    const searchInput = document.getElementById('clothes-search');
    const searchBtn = document.querySelector('.btn-search');

    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            showToast(`正在搜尋: ${query} ...`);
            // 實際應用中這裡會呼叫後端 API，目前僅做 UI 模擬
        }
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});
