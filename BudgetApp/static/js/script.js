document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        categoriesList: document.getElementById('categoriesList'),
        transactionCategory: document.getElementById('transactionCategory'),
        fromCategory: document.getElementById('fromCategory'),
        toCategory: document.getElementById('toCategory'),
        historyCategory: document.getElementById('historyCategory'),
        transactionHistory: document.getElementById('transactionHistory'),
        forms: {
            addCategory: document.getElementById('addCategoryForm'),
            transaction: document.getElementById('transactionForm'),
            transfer: document.getElementById('transferForm')
        },
        buttons: {
            generateReport: document.getElementById('generateReport')
        },
        reportType: document.getElementById('reportType'),
        reportDateRange: document.getElementById('reportDateRange'),
        customDateRange: document.getElementById('customDateRange'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate')
    };

    // Initialize date inputs
    const today = new Date().toISOString().split('T')[0];
    if (elements.startDate && elements.endDate) {
        elements.startDate.value = today;
        elements.endDate.value = today;
    }

    // Date range selection
    elements.reportDateRange?.addEventListener('change', function() {
        if (elements.customDateRange) {
            elements.customDateRange.classList.toggle('d-none', this.value !== 'custom');
        }
    });

    // Validate all required elements exist
    for (const [key, element] of Object.entries(elements)) {
        if (!element && key !== 'forms' && key !== 'buttons') {
            console.error(`Element ${key} not found`);
        }
    }

    // Load all data when page loads
    loadCategories();
    loadTransactionHistory();
    
    // Event Listeners
    elements.forms.addCategory?.addEventListener('submit', handleAddCategory);
    elements.forms.transaction?.addEventListener('submit', handleAddTransaction);
    elements.forms.transfer?.addEventListener('submit', handleTransfer);
    elements.buttons.generateReport?.addEventListener('click', handleGenerateReport);
    elements.historyCategory?.addEventListener('change', loadTransactionHistory);

    // Amount input formatting
    const amountInputs = [
        document.getElementById('transactionAmount'),
        document.getElementById('transferAmount')
    ];
    
    amountInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', formatAmountInput);
        }
    });

    // Format amount input with 2 decimal places
    function formatAmountInput(e) {
        let value = e.target.value.replace(/[^0-9.]/g, '');
        const decimalSplit = value.split('.');
        
        if (decimalSplit.length > 1) {
            value = decimalSplit[0] + '.' + decimalSplit[1].slice(0, 2);
        }
        
        e.target.value = value;
    }

    // Load all categories into dropdowns
    function loadCategories() {
        fetch('/api/categories')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data.categories) throw new Error('Invalid data format: categories missing');
                
                // Clear existing options (keeping first placeholder)
                const dropdowns = [elements.transactionCategory, elements.fromCategory, elements.toCategory, elements.historyCategory]
                    .filter(dropdown => dropdown); // Filter out null elements
                
                dropdowns.forEach(select => {
                    while (select.options.length > 1) select.remove(1);
                });
                
                // Update categories list
                if (elements.categoriesList) {
                    elements.categoriesList.innerHTML = '';
                }
                
                data.categories.forEach(category => {
                    if (!category.name || category.balance === undefined) {
                        console.warn('Invalid category data:', category);
                        return;
                    }
                    
                    // Add to categories list
                    if (elements.categoriesList) {
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        li.innerHTML = `
                            ${category.name}
                            <span class="badge bg-primary rounded-pill">${category.balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            <button class="btn btn-sm btn-danger delete-category" data-name="${category.name}">Delete</button>
                        `;
                        elements.categoriesList.appendChild(li);
                    }
                    
                    // Add to all dropdowns
                    const option = new Option(category.name, category.name);
                    dropdowns.forEach(select => {
                        select.add(option.cloneNode(true));
                    });
                });
                
                // Add event listeners to delete buttons
                document.querySelectorAll('.delete-category').forEach(button => {
                    button.addEventListener('click', function() {
                        const categoryName = this.getAttribute('data-name');
                        if (categoryName && confirm(`Are you sure you want to delete ${categoryName}?`)) {
                            deleteCategory(categoryName);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error loading categories:', error);
                alert(`Failed to load categories: ${error.message}`);
            });
    }

    // Load transaction history
    function loadTransactionHistory() {
        if (!elements.historyCategory || !elements.transactionHistory) {
            console.error('History elements not found');
            return;
        }
    
        const selectedCategory = elements.historyCategory.value;
        console.log('Loading transactions for category:', selectedCategory || 'All');

        // Show loading state
        elements.transactionHistory.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;
    
        fetch('/api/transactions')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data.transactions) throw new Error('Invalid data format: transactions missing');
                
                elements.transactionHistory.innerHTML = '';
                
                // Filter transactions by selected category if specified
                let transactions = data.transactions;
                if (selectedCategory && selectedCategory !== 'All') {
                    transactions = transactions.filter(t => t.category === selectedCategory);
                }
                
                // Sort by date (newest first)
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Display transactions
                if (transactions.length === 0) {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td colspan="4" class="text-center">No transactions found</td>`;
                    elements.transactionHistory.appendChild(row);
                    return;
                }
                
                transactions.forEach(transaction => {
                    const row = document.createElement('tr');
                    const amountClass = transaction.amount >= 0 ? 'text-success' : 'text-danger';
                    const amountSign = transaction.amount >= 0 ? '+' : '';
                    const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td>${transaction.category}</td>
                        <td>${transaction.description || '-'}</td>
                        <td class="${amountClass} fw-bold">${amountSign}${Math.abs(transaction.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    `;
                    elements.transactionHistory.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error loading transaction history:', error);
                elements.transactionHistory.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-danger">
                            Failed to load transactions: ${error.message}
                        </td>
                    </tr>
                `;
            });
    }
    
    // Handle add category
    function handleAddCategory(e) {
        e.preventDefault();
        const nameInput = document.getElementById('categoryName');
        if (!nameInput) return;
        
        const name = nameInput.value.trim();

        if (!name) {
            alert('Please enter a category name');
            return;
        }

        fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name })
        })
        .then(response => {
            if (!response.ok) return response.json().then(err => { throw err; });
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                nameInput.value = '';
                loadCategories();
            }
            alert(data.message || 'Category added successfully');
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Failed to add category');
        });
    }

    // Handle add transaction
    function handleAddTransaction(e) {
        e.preventDefault();
        if (!elements.transactionCategory) return;
        
        const category = elements.transactionCategory.value;
        const amountInput = document.getElementById('transactionAmount');
        const descriptionInput = document.getElementById('transactionDescription');
        const typeInput = document.querySelector('input[name="transactionType"]:checked');
        
        if (!amountInput || !descriptionInput || !typeInput) return;
        
        const amount = parseFloat(amountInput.value);
        const description = descriptionInput.value.trim();
        const type = typeInput.value;

        if (!category || isNaN(amount)) {
            alert('Please select a category and enter a valid amount');
            return;
        }

        // Adjust amount based on transaction type
        const transactionAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

        fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category,
                amount: transactionAmount,
                description,
                type
            })
        })
        .then(response => {
            if (!response.ok) return response.json().then(err => { throw err; });
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                if (elements.forms.transaction) elements.forms.transaction.reset();
                loadCategories();
                loadTransactionHistory();
            }
            alert(data.message || 'Transaction added successfully');
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Failed to add transaction');
        });
    }

    // Handle transfer
    function handleTransfer(e) {
        e.preventDefault();
        if (!elements.fromCategory || !elements.toCategory) return;
        
        const from = elements.fromCategory.value;
        const to = elements.toCategory.value;
        const amountInput = document.getElementById('transferAmount');
        
        if (!amountInput) return;
        
        const amount = parseFloat(amountInput.value);
        
        if (!from || !to || from === to || isNaN(amount)) {
            alert('Please select different categories and enter a valid amount');
            return;
        }
        
        fetch('/api/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                from_category: from, 
                to_category: to, 
                amount 
            })
        })
        .then(response => {
            if (!response.ok) return response.json().then(err => { throw err; });
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                if (elements.forms.transfer) elements.forms.transfer.reset();
                loadCategories();
                loadTransactionHistory();
            }
            alert(data.message || 'Transfer completed successfully');
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Failed to transfer funds');
        });
    }
    
    // Enhanced report generation
    function handleGenerateReport() {
        if (!elements.reportType || !elements.reportDateRange) return;
        
        const reportBtn = elements.buttons.generateReport;
        if (!reportBtn) return;
        
        const originalBtnText = reportBtn.innerHTML;
        
        // Set loading state
        reportBtn.disabled = true;
        reportBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Generating Report...
        `;
        
        // Get report parameters
        const params = new URLSearchParams();
        params.append('type', elements.reportType.value);
        params.append('range', elements.reportDateRange.value);
        
        // Handle custom date range
        if (elements.reportDateRange.value === 'custom') {
            if (!elements.startDate || !elements.endDate) {
                showAlert('Please select both start and end dates', 'warning');
                resetButton(reportBtn, originalBtnText);
                return;
            }
            
            params.append('start', elements.startDate.value);
            params.append('end', elements.endDate.value);
        }
        
        fetch(`/api/report?${params.toString()}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { 
                        throw new Error(err.message || response.statusText); 
                    });
                }
                
                // Get filename from headers or generate default
                const disposition = response.headers.get('content-disposition');
                let filename = 'budget_report';
                
                if (disposition && disposition.indexOf('filename=') !== -1) {
                    filename = disposition.split('filename=')[1].replace(/"/g, '');
                } else {
                    const ext = elements.reportType.value === 'csv' ? '.csv' : '.txt';
                    filename = `budget_report_${new Date().toISOString().slice(0,10)}${ext}`;
                }
                
                return response.blob().then(blob => ({ blob, filename }));
            })
            .then(({ blob, filename }) => {
                // Trigger download
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 100);
                
                showAlert('Report downloaded successfully!', 'success');
            })
            .catch(error => {
                console.error('Error generating report:', error);
                showAlert(error.message || 'Failed to generate report', 'danger');
            })
            .finally(() => {
                resetButton(reportBtn, originalBtnText);
            });
    }
    
    // Helper function to reset button state
    function resetButton(button, originalHtml) {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
    
    // Helper function to show alerts
    function showAlert(message, type = 'info') {
        // Remove existing alerts
        document.querySelectorAll('.alert').forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.querySelector('.container').prepend(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000);
    }
    
    // Delete category
    function deleteCategory(name) {
        if (!name) return;
        
        fetch(`/api/categories/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) return response.json().then(err => { throw err; });
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                loadCategories();
                loadTransactionHistory();
            }
            alert(data.message || 'Category deleted successfully');
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Failed to delete category');
        });
    }
});