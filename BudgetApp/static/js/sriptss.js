// document.addEventListener('DOMContentLoaded', function() {
//     // DOM Elements
//     const categoriesList = document.getElementById('categoriesList');
//     const transactionCategory = document.getElementById('transactionCategory');
//     const fromCategory = document.getElementById('fromCategory');
//     const toCategory = document.getElementById('toCategory');
//     const historyCategory = document.getElementById('historyCategory');
//     const transactionHistory = document.getElementById('transactionHistory');
    
//     // Forms
//     const addCategoryForm = document.getElementById('addCategoryForm');
//     const transactionForm = document.getElementById('transactionForm');
//     const transferForm = document.getElementById('transferForm');
//     const generateReport = document.getElementById('generateReport');
    
//     // Load all data when page loads
//     loadCategories();
//     loadTransactionHistory();
    
//     // Event Listeners
//     addCategoryForm.addEventListener('submit', handleAddCategory);
//     transactionForm.addEventListener('submit', handleAddTransaction);
//     transferForm.addEventListener('submit', handleTransfer);
//     generateReport.addEventListener('click', handleGenerateReport);
//     historyCategory.addEventListener('change', loadTransactionHistory);
    
//     // // Load all categories into dropdowns
//     function loadCategories() {
//         fetch('/api/categories')
//             .then(response => {
//                 if (!response.ok) throw new Error('Network response was not ok');
//                 return response.json();
//             })
//             .then(data => {
//                 // Clear existing options (keeping first placeholder)
//                 [transactionCategory, fromCategory, toCategory, historyCategory].forEach(select => {
//                     while (select.options.length > 1) select.remove(1);
//                 });
                
//                 // Update categories list
//                 categoriesList.innerHTML = '';
                
//                 data.categories.forEach(category => {
//                     // Add to categories list
//                     const li = document.createElement('li');
//                     li.className = 'list-group-item d-flex justify-content-between align-items-center';
//                     li.innerHTML = `
//                         ${category.name}
//                         <span class="badge bg-primary rounded-pill">$${category.balance.toFixed(2)}</span>
//                         <button class="btn btn-sm btn-danger delete-category" data-name="${category.name}">Delete</button>
//                     `;
//                     categoriesList.appendChild(li);
                    
//                     // Add to all dropdowns
//                     const option = new Option(category.name, category.name);
//                     [transactionCategory, fromCategory, toCategory, historyCategory].forEach(select => {
//                         select.add(option.cloneNode(true));
//                     });
//                 });
                
//                 // Add event listeners to delete buttons
//                 document.querySelectorAll('.delete-category').forEach(button => {
//                     button.addEventListener('click', function() {
//                         const categoryName = this.getAttribute('data-name');
//                         if (confirm(`Are you sure you want to delete ${categoryName}?`)) {
//                             deleteCategory(categoryName);
//                         }
//                     });
//                 });
//             })
//             .catch(error => {
//                 console.error('Error loading categories:', error);
//                 alert('Failed to load categories');
//             });
//     }
    
//     // Load transaction history
//     function loadTransactionHistory() {
//         const selectedCategory = historyCategory.value;
        
//         fetch('/api/categories')
//             .then(response => {
//                 if (!response.ok) throw new Error('Network response was not ok');
//                 return response.json();
//             })
//             .then(data => {
//                 transactionHistory.innerHTML = '';
//                 let allTransactions = [];
                
//                 data.categories.forEach(category => {
//                     if (!selectedCategory || category.name === selectedCategory) {
//                         category.ledger.forEach(transaction => {
//                             allTransactions.push({
//                                 ...transaction,
//                                 category: category.name
//                             });
//                         });
//                     }
//                 });
                
//                 // Sort by date (newest first)
//                 allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
//                 // Display transactions
//                 allTransactions.forEach(transaction => {
//                     const row = document.createElement('tr');
//                     const amountClass = transaction.amount >= 0 ? 'text-success' : 'text-danger';
                    
//                     row.innerHTML = `
//                         <td>${new Date(transaction.date).toLocaleString()}</td>
//                         <td>${transaction.category}</td>
//                         <td>${transaction.description || '-'}</td>
//                         <td class="${amountClass}">${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)}</td>
//                     `;
//                     transactionHistory.appendChild(row);
//                 });
//             })
//             .catch(error => {
//                 console.error('Error loading transaction history:', error);
//                 alert('Failed to load transaction history');
//             });
//     }
    
//     // Handle add category
//     function handleAddCategory(e) {
//         e.preventDefault();
//         const nameInput = document.getElementById('categoryName');
//         const name = nameInput.value.trim();

//         if (!name) {
//             alert('Please enter a category name');
//             return;
//         }

//         fetch('/api/categories', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ name })
//         })
//         .then(response => {
//             if (!response.ok) return response.json().then(err => { throw err; });
//             return response.json();
//         })
//         .then(data => {
//             if (data.status === 'success') {
//                 nameInput.value = '';
//                 loadCategories();
//             }
//             alert(data.message);
//         })
//         .catch(error => {
//             console.error('Error:', error);
//             alert(error.message || 'Failed to add category');
//         });
//     }

//     // Handle add transaction (NEW - was missing from original)
//     function handleAddTransaction(e) {
//         e.preventDefault();
//         const category = transactionCategory.value;
//         const amount = parseFloat(document.getElementById('transactionAmount').value);
//         const description = document.getElementById('transactionDescription').value.trim();
//         const type = document.querySelector('input[name="transactionType"]:checked').value;

//         if (!category || isNaN(amount)) {
//             alert('Please select a category and enter a valid amount');
//             return;
//         }

//         fetch('/api/transactions', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 category,
//                 amount,
//                 description,
//                 type
//             })
//         })
//         .then(response => {
//             if (!response.ok) return response.json().then(err => { throw err; });
//             return response.json();
//         })
//         .then(data => {
//             if (data.status === 'success') {
//                 transactionForm.reset();
//                 loadCategories();
//                 loadTransactionHistory();
//             }
//             alert(data.message);
//         })
//         .catch(error => {
//             console.error('Error:', error);
//             alert(error.message || 'Failed to add transaction');
//         });
//     }

//     // Handle transfer
//     function handleTransfer(e) {
//         e.preventDefault();
//         const from = fromCategory.value;
//         const to = toCategory.value;
//         const amount = parseFloat(document.getElementById('transferAmount').value);
        
//         if (!from || !to || from === to || isNaN(amount)) {
//             alert('Please select different categories and enter a valid amount');
//             return;
//         }
        
//         fetch('/api/transfer', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ 
//                 from_category: from, 
//                 to_category: to, 
//                 amount 
//             })
//         })
//         .then(response => {
//             if (!response.ok) return response.json().then(err => { throw err; });
//             return response.json();
//         })
//         .then(data => {
//             if (data.status === 'success') {
//                 transferForm.reset();
//                 loadCategories();
//                 loadTransactionHistory();
//             }
//             alert(data.message);
//         })
//         .catch(error => {
//             console.error('Error:', error);
//             alert(error.message || 'Failed to transfer funds');
//         });
//     }
    
//     // Handle generate report
//     function handleGenerateReport() {
//         fetch('/api/report')
//             .then(response => {
//                 if (!response.ok) throw new Error('Network response was not ok');
//                 return response.blob();
//             })
//             .then(blob => {
//                 const url = window.URL.createObjectURL(blob);
//                 const a = document.createElement('a');
//                 a.href = url;
//                 a.download = 'budget_report.txt';
//                 document.body.appendChild(a);
//                 a.click();
//                 document.body.removeChild(a);
//                 window.URL.revokeObjectURL(url);
//             })
//             .catch(error => {
//                 console.error('Error:', error);
//                 alert('Failed to generate report');
//             });
//     }
    
//     // Delete category
//     function deleteCategory(name) {
//         fetch(`/api/categories/${name}`, {
//             method: 'DELETE'
//         })
//         .then(response => {
//             if (!response.ok) return response.json().then(err => { throw err; });
//             return response.json();
//         })
//         .then(data => {
//             if (data.status === 'success') {
//                 loadCategories();
//                 loadTransactionHistory();
//             }
//             alert(data.message);
//         })
//         .catch(error => {
//             console.error('Error:', error);
//             alert(error.message || 'Failed to delete category');
//         });
//     }
// });