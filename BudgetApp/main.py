from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.popup import Popup
from kivy.uix.spinner import Spinner
from datetime import datetime
from kivymd.app import MDApp
from kivymd.uix.datatables import MDDataTable
from kivy.metrics import dp

[app]
# (Your app name)
title = BudgetApp
package.name = budgetapp
package.domain = org.example

# (Kivy version and dependencies)
requirements = python3, kivy==2.1.0, kivymd

# (Android-specific settings)
android.permissions = INTERNET
android.api = 33
android.minapi = 21
android.ndk = 23b
android.sdk = 33
android.arch = arm64-v8a

# (Orientation)
orientation = portrait

# (Other settings)
log_level = 2
warn_on_root = 1

# Your existing Category class (unchanged)
class Category:
    def __init__(self, name):
        self.name = name
        self.ledger = []

    def deposit(self, amount, description='', date=None):
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.ledger.append({'amount': amount, 'description': description, 'date': date})

    def withdraw(self, amount, description='', date=None):
        if self.check_funds(amount):
            if date is None:
                date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.ledger.append({'amount': -amount, 'description': description, 'date': date})
            return True
        return False

    def get_balance(self):
        return sum(item['amount'] for item in self.ledger)

    def transfer(self, amount, category):
        if self.check_funds(amount):
            date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.withdraw(amount, f"Transfer to {category.name}", date)
            category.deposit(amount, f"Transfer from {self.name}", date)
            return True
        return False

    def check_funds(self, amount):
        return amount <= self.get_balance()

    def generate_report(self):
        report = f"Category: {self.name}\n"
        report += "=" * 50 + "\n"
        for i, item in enumerate(self.ledger):
            date = item['date'][:19]
            description = item['description'][:20].ljust(20)
            amount = f"{item['amount']:.2f}".rjust(7)
            report += f"{i}. {date} | {description} | {amount}\n"
        report += "=" * 50 + "\n"
        report += f"Total Balance: {self.get_balance():.2f}\n"
        return report

class BudgetApp(MDApp):
    def build(self):
        self.categories = {}
        self.theme_cls.primary_palette = "Teal"
        
        # Main Layout
        layout = BoxLayout(orientation="vertical", padding=10, spacing=10)
        
        # Title
        layout.add_widget(Label(text="Budget Management App", font_size=24, bold=True))
        
        # Category Input
        cat_layout = BoxLayout(spacing=10)
        self.category_input = TextInput(hint_text="Category Name", size_hint=(0.7, None), height=40)
        cat_layout.add_widget(self.category_input)
        cat_layout.add_widget(Button(text="Create", size_hint=(0.3, None), height=40, on_press=self.create_category))
        layout.add_widget(cat_layout)
        
        # Transaction Inputs
        self.amount_input = TextInput(hint_text="Amount", input_filter="float")
        self.desc_input = TextInput(hint_text="Description")
        self.target_cat_spinner = Spinner(values=[], size_hint=(1, None), height=40, text="Select Target Category")
        
        # Add widgets to layout
        layout.add_widget(self.amount_input)
        layout.add_widget(self.desc_input)
        layout.add_widget(self.target_cat_spinner)
        
        # Buttons for actions
        btn_layout = BoxLayout(spacing=10, size_hint=(1, None), height=50)
        btn_layout.add_widget(Button(text="Deposit", on_press=self.deposit))
        btn_layout.add_widget(Button(text="Withdraw", on_press=self.withdraw))
        btn_layout.add_widget(Button(text="Transfer", on_press=self.transfer))
        btn_layout.add_widget(Button(text="View Report", on_press=self.view_report))
        layout.add_widget(btn_layout)
        
        # Transactions Table (Scrollable)
        self.table = MDDataTable(
            size_hint=(1, 0.6),
            column_data=[
                ("No.", dp(20)),
                ("Date", dp(30)),
                ("Description", dp(40)),
                ("Amount", dp(20)),
            ],
            row_data=[],
        )
        layout.add_widget(self.table)
        
        return layout

    def create_category(self, instance):
        name = self.category_input.text.strip()
        if name and name not in self.categories:
            self.categories[name] = Category(name)
            self.target_cat_spinner.values = list(self.categories.keys())
            self.show_popup("Success", f"Category '{name}' created!")
            self.category_input.text = ""
        else:
            self.show_popup("Error", "Category exists or invalid name!")

    def deposit(self, instance):
        category_name = self.category_input.text.strip()
        amount = self.validate_amount(self.amount_input.text)
        description = self.desc_input.text.strip()
        
        if category_name in self.categories and amount is not None:
            self.categories[category_name].deposit(amount, description)
            self.show_popup("Success", f"Deposited {amount} into '{category_name}'.")
            self.update_table(category_name)
            self.clear_inputs()

    def withdraw(self, instance):
        category_name = self.category_input.text.strip()
        amount = self.validate_amount(self.amount_input.text)
        description = self.desc_input.text.strip()
        
        if category_name in self.categories and amount is not None:
            if self.categories[category_name].withdraw(amount, description):
                self.show_popup("Success", f"Withdrew {amount} from '{category_name}'.")
                self.update_table(category_name)
                self.clear_inputs()
            else:
                self.show_popup("Error", f"Insufficient funds in '{category_name}'.")

    def transfer(self, instance):
        from_category = self.category_input.text.strip()
        to_category = self.target_cat_spinner.text
        amount = self.validate_amount(self.amount_input.text)
        
        if from_category in self.categories and to_category in self.categories and amount is not None:
            if self.categories[from_category].transfer(amount, self.categories[to_category]):
                self.show_popup("Success", f"Transferred {amount} to '{to_category}'.")
                self.update_table(from_category)
                self.update_table(to_category)
                self.clear_inputs()
            else:
                self.show_popup("Error", f"Insufficient funds in '{from_category}'.")

    def view_report(self, instance):
        category_name = self.category_input.text.strip()
        if category_name in self.categories:
            report = self.categories[category_name].generate_report()
            self.show_popup(f"Report: {category_name}", report)
        else:
            self.show_popup("Error", "Category does not exist!")

    def validate_amount(self, amount_str):
        try:
            amount = float(amount_str)
            if amount <= 0:
                raise ValueError("Amount must be positive.")
            return amount
        except ValueError:
            self.show_popup("Error", "Invalid amount! Enter a positive number.")
            return None

    def update_table(self, category_name):
        self.table.row_data = []
        for i, transaction in enumerate(self.categories[category_name].ledger):
            self.table.row_data.append(
                (str(i), transaction['date'], transaction['description'], f"{transaction['amount']:.2f}")
            )

    def clear_inputs(self):
        self.amount_input.text = ""
        self.desc_input.text = ""

    def show_popup(self, title, message):
        popup = Popup(title=title, size_hint=(0.8, 0.4))
        popup.content = Label(text=message)
        popup.open()

if __name__ == "__main__":
    BudgetApp().run()