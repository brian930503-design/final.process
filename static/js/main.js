document.addEventListener('DOMContentLoaded', () => {
    // === 佈景主題切換 (Dark/Light Mode) ===
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const btnThemeLight = document.getElementById('btn-theme-light');
    const btnThemeDark = document.getElementById('btn-theme-dark');
    
    if (btnThemeLight && btnThemeDark) {
        btnThemeLight.addEventListener('click', () => {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            showToast('已切換至淺色模式');
        });
        btnThemeDark.addEventListener('click', () => {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            showToast('已切換至深色模式');
        });
    }

    // === Chart.js (原衣物佔比) ===
    let chartInstance = null;
    function fetchAndRenderChart() {
        const chartCanvas = document.getElementById('clothesChart');
        if (!chartCanvas) return;
        
        // 此處我們稍微偷懶，前端動態統整 API 資料為 chart.js 需要的格式，或請後端回傳。
        // 但為了符合原型，我們發送請求至 /api/clothes 統計所有類別
        fetch('/api/clothes')
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    const clothes = data.data;
                    const categoryCount = {};
                    clothes.forEach(c => {
                        categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
                    });
                    
                    const labels = Object.keys(categoryCount);
                    const counts = Object.values(categoryCount);

                    if(labels.length === 0) {
                        labels.push('尚無衣物');
                        counts.push(1);
                    }

                    const ctx = chartCanvas.getContext('2d');
                    if (chartInstance) chartInstance.destroy();
                    chartInstance = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: labels,
                            datasets: [{
                                data: counts,
                                backgroundColor: ['#2b6cb0', '#4a5568', '#e2e8f0', '#718096', '#2c5282', '#a0aec0'],
                                borderWidth: 0
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
            });
    }
    fetchAndRenderChart();

    // === Toast ===
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    function showToast(message) {
        if(!toast) return;
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // === 一般按鈕 (除濕、殺菌、推薦) ===
    document.getElementById('btn-dehumidify')?.addEventListener('click', () => {
        fetch('/api/action/dehumidify', { method: 'POST' }).then(r=>r.json()).then(d=>showToast(d.message));
    });
    document.getElementById('btn-uvc')?.addEventListener('click', () => {
        fetch('/api/action/uvc', { method: 'POST' }).then(r=>r.json()).then(d=>{
            showToast(d.message);
            const valUvc = document.getElementById('val-uvc');
            if (valUvc) { valUvc.textContent = 'ON'; valUvc.style.color = '#e53e3e'; }
        });
    });
    document.getElementById('btn-custom-filter')?.addEventListener('click', () => {
        const color = document.getElementById('filter-color').value;
        const style = document.getElementById('filter-style').value;
        const category = document.getElementById('filter-category').value;
        fetch('/api/custom_recommendation', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({color, style, category})
        }).then(r=>r.json()).then(d=>{
            if(d.status==='success') {
                document.getElementById('rec-top').textContent = d.recommendation.top;
                document.getElementById('rec-bottom').textContent = d.recommendation.bottom;
                document.getElementById('rec-shoes').textContent = d.recommendation.shoes;
                showToast('已更新推薦！');
            }
        });
    });
    document.getElementById('btn-submit-satisfaction')?.addEventListener('click', () => {
        const rating = document.getElementById('rating').value;
        const feedback = document.getElementById('feedback').value;
        fetch('/api/satisfaction', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({rating: parseInt(rating), feedback: feedback})
        }).then(r=>r.json()).then(d=>{
            showToast(d.message);
            if (d.status === 'success') {
                document.getElementById('feedback').value = '';
                document.getElementById('rating').value = '5';
            }
        });
    });

    // === 修改密碼 ===
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            fetch('/api/change_password', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({old_password: oldPassword, new_password: newPassword})
            }).then(r=>r.json()).then(data => {
                showToast(data.message);
                if (data.status === 'success') {
                    setTimeout(() => window.location.href = '/logout', 1500);
                }
            });
        });
    }

    // === 衣物 CRUD ===
    const modalAddClothes = document.getElementById('modal-add-clothes');
    const modalClothesList = document.getElementById('modal-clothes-list');
    const clothesListContainer = document.getElementById('clothes-list-container');
    const clothesListTitle = document.getElementById('clothes-list-title');
    
    // Close Modals
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modalAddClothes?.classList.add('hidden');
            modalClothesList?.classList.add('hidden');
        });
    });

    // Add Clothes
    document.getElementById('btn-add-clothes')?.addEventListener('click', () => {
        modalAddClothes.classList.remove('hidden');
    });

    document.getElementById('add-clothes-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('clothes-name').value;
        const category = document.getElementById('clothes-category').value;
        const color = document.getElementById('clothes-color').value;
        const style = document.getElementById('clothes-style').value;

        fetch('/api/clothes/add', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, category, color, style})
        }).then(r=>r.json()).then(d => {
            showToast(d.message);
            modalAddClothes.classList.add('hidden');
            document.getElementById('add-clothes-form').reset();
            fetchAndRenderChart(); // reload chart
        });
    });

    // Fetch and render list
    function loadClothesList(query = '') {
        const url = query ? `/api/clothes?q=${encodeURIComponent(query)}` : '/api/clothes';
        fetch(url).then(r=>r.json()).then(d => {
            if(d.status === 'success') {
                clothesListContainer.innerHTML = '';
                if(d.data.length === 0) {
                    clothesListContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">無符合的衣物</p>';
                } else {
                    d.data.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'clothes-list-item';
                        div.innerHTML = `
                            <div>
                                <strong>${item.name}</strong> <span style="color:var(--text-muted); font-size: 0.85em;">(${item.category})</span><br>
                                <small>${item.color || '無顏色'} / ${item.style || '無款式'}</small>
                            </div>
                            <button class="btn btn-secondary btn-delete" data-id="${item.id}" style="padding: 6px 12px; background-color: #e53e3e;">刪除</button>
                        `;
                        clothesListContainer.appendChild(div);
                    });

                    // bind delete buttons
                    document.querySelectorAll('.btn-delete').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = e.target.getAttribute('data-id');
                            fetch('/api/clothes/delete', {
                                method: 'POST', headers: {'Content-Type':'application/json'},
                                body: JSON.stringify({id: parseInt(id)})
                            }).then(r=>r.json()).then(delData => {
                                showToast(delData.message);
                                loadClothesList(query);
                                fetchAndRenderChart();
                            });
                        });
                    });
                }
            }
        });
    }

    // All Clothes
    document.getElementById('btn-all-clothes')?.addEventListener('click', () => {
        clothesListTitle.textContent = '所有衣物清單';
        loadClothesList();
        modalClothesList.classList.remove('hidden');
    });

    // Search Clothes
    const searchBtn = document.querySelector('.btn-search');
    const searchInput = document.getElementById('clothes-search');
    if (searchBtn && searchInput) {
        function performSearch() {
            const q = searchInput.value.trim();
            clothesListTitle.textContent = q ? `搜尋結果: ${q}` : '所有衣物清單';
            loadClothesList(q);
            modalClothesList.classList.remove('hidden');
        }
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') performSearch();
        });
    }
});
