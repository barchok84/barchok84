from flask import Flask, render_template, request, jsonify, send_file, make_response
from io import StringIO, BytesIO
import json
import os
import csv
import traceback
from datetime import datetime,timedelta


app = Flask(__name__)

# In-memory data store 
categories = [
    {"name": "Food", "balance": 100.00, "ledger": []},
    {"name": "Transport", "balance": 50.00, "ledger": []}
]
# Absolute path to the data file
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "budget_data.json")
# print(f"Data will be saved to: {DATA_FILE}")

def ensure_data_file():
    """Create data file with initial structure if it doesn't exist"""
    if not os.path.exists(DATA_FILE):
        initial_data = {"categories": {}, "transactions": []}
        with open(DATA_FILE, 'w') as f:
            json.dump(initial_data, f, indent=4)
        print("Created new data file")

def load_data():
    """Load data from file with error handling"""
    try:
        ensure_data_file()
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
            # Backward compatibility check
            if "transactions" not in data:
                data["transactions"] = []
            return data
    except json.JSONDecodeError:
        print("Data file corrupted, resetting...")
        backup = DATA_FILE + ".bak"
        if os.path.exists(DATA_FILE):
            os.rename(DATA_FILE, backup)
        ensure_data_file()
        return {"categories": {}, "transactions": []}
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return {"categories": {}, "transactions": []}

def save_data(data):
    """Save data to file atomically"""
    try:
        temp_file = DATA_FILE + ".tmp"
        
        # Write to temporary file
        with open(temp_file, 'w') as f:
            json.dump(data, f, indent=4)
            f.flush()  # Ensure data is written
            os.fsync(f.fileno())  # Force write to disk
        
        # Replace original file
        if os.path.exists(DATA_FILE):
            os.remove(DATA_FILE)
        os.rename(temp_file, DATA_FILE)
        
        print("Data saved successfully")
        return True
    except Exception as e:
        print(f"Error saving data: {str(e)}")
        return False

def calculate_balance(category):
    """Calculate current balance for a category"""
    return sum(item["amount"] for item in category["ledger"])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/js/script.js')
def serve_js():
    return send_file('static/js/script.js')

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories with their current balance"""
    data = load_data()
    categories = [{
        "name": name,
        "balance": calculate_balance(category)
    } for name, category in data["categories"].items()]
    return jsonify({"status": "success", "categories": categories})

@app.route('/api/categories', methods=['POST'])
def add_category():
    """Add a new category"""
    try:
        data = load_data()
        category_name = request.json.get("name", "").strip()
        
        if not category_name:
            return jsonify({"status": "error", "message": "Category name required"}), 400
            
        if category_name in data["categories"]:
            return jsonify({"status": "error", "message": "Category already exists"}), 400
            
        data["categories"][category_name] = {"ledger": []}
        
        if save_data(data):
            return jsonify({
                "status": "success",
                "message": "Category added",
                "category": {
                    "name": category_name,
                    "balance": 0
                }
            })
        return jsonify({"status": "error", "message": "Failed to save data"}), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get transactions, optionally filtered by category"""
    try:
        data = load_data()
        category_filter = request.args.get("category")
        
        if category_filter and category_filter != "All Categories":
            transactions = [t for t in data["transactions"] if t["category"] == category_filter]
        else:
            transactions = data["transactions"]
            
        return jsonify({
            "status": "success",
            "transactions": transactions,
            "categories": list(data["categories"].keys())  # Include available categories
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    """Add a new transaction"""
    try:
        data = load_data()
        category_name = request.json.get("category")
        amount = float(request.json.get("amount", 0))
        description = request.json.get("description", "").strip()
        transaction_type = request.json.get("type")
        
        # Validation
        if category_name not in data["categories"]:
            return jsonify({"status": "error", "message": "Invalid category"}), 400
            
        if transaction_type not in ("deposit", "withdraw"):
            return jsonify({"status": "error", "message": "Invalid transaction type"}), 400
            
        if amount <= 0:
            return jsonify({"status": "error", "message": "Amount must be positive"}), 400
            
        current_balance = calculate_balance(data["categories"][category_name])
        if transaction_type == "withdraw" and amount > current_balance:
            return jsonify({
                "status": "error",
                "message": "Insufficient funds",
                "current_balance": current_balance
            }), 400
            
        # Create transaction
        transaction = {
            "amount": amount if transaction_type == "deposit" else -amount,
            "description": description,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": transaction_type,
            "category": category_name
        }
        
        # Update data
        data["categories"][category_name]["ledger"].append(transaction)
        data["transactions"].append(transaction)
        
        if save_data(data):
            return jsonify({
                "status": "success",
                "message": "Transaction added",
                "transaction": transaction,
                "new_balance": calculate_balance(data["categories"][category_name])
            })
        return jsonify({"status": "error", "message": "Failed to save data"}), 500
        
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid amount"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/transfer', methods=['POST'])
def transfer_funds():
    """Transfer funds between categories"""
    try:
        data = load_data()
        from_cat = request.json.get("from_category")
        to_cat = request.json.get("to_category")
        amount = float(request.json.get("amount", 0))
        
        # Validation
        if from_cat not in data["categories"] or to_cat not in data["categories"]:
            return jsonify({"status": "error", "message": "Invalid categories"}), 400
            
        if amount <= 0:
            return jsonify({"status": "error", "message": "Amount must be positive"}), 400
            
        from_balance = calculate_balance(data["categories"][from_cat])
        if amount > from_balance:
            return jsonify({
                "status": "error",
                "message": "Insufficient funds",
                "current_balance": from_balance
            }), 400
            
        # Create transactions
        withdraw_transaction = {
            "amount": -amount,
            "description": f"Transfer to {to_cat}",
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": "transfer_out",
            "category": from_cat
        }
        
        deposit_transaction = {
            "amount": amount,
            "description": f"Transfer from {from_cat}",
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": "transfer_in",
            "category": to_cat
        }
        
        # Update data
        data["categories"][from_cat]["ledger"].append(withdraw_transaction)
        data["categories"][to_cat]["ledger"].append(deposit_transaction)
        data["transactions"].extend([withdraw_transaction, deposit_transaction])
        
        if save_data(data):
            return jsonify({
                "status": "success",
                "message": "Transfer completed",
                "from_balance": calculate_balance(data["categories"][from_cat]),
                "to_balance": calculate_balance(data["categories"][to_cat])
            })
        return jsonify({"status": "error", "message": "Failed to save data"}), 500
        
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid amount"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
# delete category
@app.route('/api/categories/<category_name>', methods=['DELETE'])
def delete_category(category_name):
    try:
        data = load_data()
        
        # Check if category exists
        if category_name not in data["categories"]:
            return jsonify({
                "status": "error",
                "message": "Category not found"
            }), 404

        # Delete the category
        del data["categories"][category_name]

        # Remove all transactions for this category
        data["transactions"] = [
            t for t in data["transactions"] 
            if t["category"] != category_name
        ]

        if save_data(data):
            return jsonify({
                "status": "success",
                "message": f"Category '{category_name}' deleted"
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to save data"
            }), 500

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    
    # generate report in csv/text.......
@app.route('/api/report', methods=['GET'])
def generate_report():
    try:
        # Get report parameters from request
        report_type = request.args.get('type', 'txt')  # txt or csv
        detailed = request.args.get('detailed', 'false').lower() == 'true'
        date_range = request.args.get('range', 'all')
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        # Validate and parse dates
        if date_range == 'custom' and (not start_date or not end_date):
            return jsonify({"error": "Custom range requires both start and end dates"}), 400
            
        # Calculate date range
        now = datetime.now()
        if date_range == 'today':
            start_date = now.date()
            end_date = now.date()
        elif date_range == 'week':
            start_date = now.date() - timedelta(days=now.weekday())
            end_date = now.date()
        elif date_range == 'month':
            start_date = now.replace(day=1).date()
            end_date = now.date()
        elif date_range == 'year':
            start_date = now.replace(month=1, day=1).date()
            end_date = now.date()
        
        # Load and filter data
        data = load_data()
        
        # Filter transactions by date if needed
        if date_range != 'all':
            transactions = []
            for t in data.get('transactions', []):
                t_date = datetime.strptime(t['date'], '%Y-%m-%d').date()
                if t_date >= start_date and t_date <= end_date:
                    transactions.append(t)
            data['transactions'] = transactions
        
        # Generate report content based on type
        if report_type == 'csv':
            report_content = generate_csv_report(data, detailed)
            filename = f"budget_report_{datetime.now().strftime('%Y%m%d')}.csv"
            content_type = 'text/csv'
        else:
            report_content = generate_text_report(data, detailed)
            filename = f"budget_report_{datetime.now().strftime('%Y%m%d')}.txt"
            content_type = 'text/plain'
        
        # Create response
        response = make_response(report_content)
        response.headers['Content-Type'] = content_type
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        return response
        
    except Exception as e:
        app.logger.error(f"Report generation failed: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            "status": "error",
            "message": "Failed to generate report",
            "error": str(e)
        }), 500

def generate_text_report(data, detailed=False):
    """Generate text format report with complete balance information"""
    report_lines = [
        f"Budget Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "=" * 100,
        f"{'Date':<20} {'Category':<15} {'Type':<10} {'Amount':>10} {'description':>30}",
        "-" * 100
    ]
    
    # Add transactions
    for t in sorted(data.get('transactions', []), key=lambda x: x.get('date', '')):
        report_lines.append(
            f"{t.get('date','N/A'):<20} "
            f"{t.get('category','Uncategorized'):<15} "
            f"{t.get('type','other'):<10} "
            f"{float(t.get('amount',0)):>10.2f} "
            f"{t.get('description', ''):<30}"
        )
    
    # Add summary with properly calculated balances
    report_lines.extend([
        "\n" + "=" * 50,
        "Category Balances:",
        "-" * 50
    ])
    
    # Calculate balances properly (same method as CSV report)
    category_balances = {}
    for cat_name, cat_data in data.get('categories', {}).items():
        balance = calculate_balance(cat_data)
        category_balances[cat_name] = balance
        report_lines.append(f"{cat_name:<15} {balance:>15.2f}")
    
    total_balance = sum(category_balances.values())
    report_lines.extend([
        "-" * 50,
        f"{'Total Balance:':<15} {total_balance:>15.2f}",
        "=" * 50
    ])
    
    return "\n".join(report_lines)
    
# generate reports
def generate_csv_report(data, detailed=False):
    """Generate CSV format report"""
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Date', 'Category', 'Type', 'Amount', 'Description'])
    
    # Write transactions
    for t in data.get('transactions', []):
        writer.writerow([
            t.get('date', ''),
            t.get('category', ''),
            t.get('type', ''),
            t.get('amount', ''),
            t.get('description', '')
        ])
    
    # Calculate and write summary
    writer.writerow([])
    writer.writerow(['Category', 'Balance'])
    
    # First calculate all balances
    category_balances = {}
    for cat_name, cat_data in data.get('categories', {}).items():
        balance = calculate_balance(cat_data)
        category_balances[cat_name] = balance
        writer.writerow([cat_name, balance])
    
    writer.writerow([])
    writer.writerow(['Total Balance', sum(category_balances.values())])
    
    return output.getvalue()
    

    
if __name__ == "__main__":
    ensure_data_file()  # Initialize on startup
    app.run(debug=True)