"""
Stripe Payment Link Setup - Know Your Homebook
Creates product and payment link for the digital guide ($49)

Usage:
    1. Ensure STRIPE_SECRET_KEY is in .env
    2. Run: python scripts/create-stripe-payment.py
"""

import os
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add parent directory to path for .env loading
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    from dotenv import load_dotenv
except ImportError:
    print("Installing python-dotenv...")
    os.system("pip install python-dotenv --quiet")
    from dotenv import load_dotenv

try:
    import stripe
except ImportError:
    print("Installing stripe package...")
    os.system("pip install stripe --quiet")
    import stripe

# Load environment variables
load_dotenv(Path.home() / '.env')

def create_homebook_payment():
    """Create Stripe product and payment link for Know Your Homebook"""

    api_key = os.getenv('STRIPE_SECRET_KEY')

    if not api_key:
        print("\n[ERROR] STRIPE_SECRET_KEY not found in .env")
        print("\nSetup Instructions:")
        print("1. Go to: https://dashboard.stripe.com/apikeys")
        print("2. Copy your 'Secret key' (starts with sk_test_ or sk_live_)")
        print("3. Add to ~/.env file:")
        print("   STRIPE_SECRET_KEY=sk_test_your_key_here")
        print("4. Run this script again")
        return None

    stripe.api_key = api_key
    is_live = api_key.startswith('sk_live_')

    print("\n" + "=" * 70)
    print("KNOW YOUR HOMEBOOK - Stripe Payment Setup")
    print("=" * 70)
    print(f"Mode: {'[LIVE]' if is_live else '[TEST]'}")

    # Create the product
    print("\nCreating Product...")
    try:
        product = stripe.Product.create(
            name="Know Your Homebook - Digital Guide",
            description="40-page printable homeowner's guide & maintenance binder. Turn your house into a well-documented asset.",
            metadata={
                "brand": "MoosePack Home",
                "type": "digital_download",
                "pages": "40"
            }
        )
        print(f"   [OK] Product created: {product.id}")

        # Create price ($49)
        price = stripe.Price.create(
            product=product.id,
            unit_amount=4900,  # $49.00
            currency="usd",
        )
        print(f"   [OK] Price created: $49.00")

        # Create payment link
        payment_link = stripe.PaymentLink.create(
            line_items=[{"price": price.id, "quantity": 1}],
            after_completion={
                "type": "redirect",
                "redirect": {
                    "url": "https://charlesmartinedd.github.io/kindles-book-project/success.html?purchase=success"
                }
            },
            custom_text={
                "submit": {"message": "You'll receive instant access to download your 40-page printable guide!"}
            },
            metadata={
                "product": "know-your-homebook"
            }
        )

        payment_url = payment_link.url

        print("\n" + "=" * 70)
        print("[SUCCESS] PAYMENT LINK CREATED!")
        print("=" * 70)
        print(f"\nPayment URL: {payment_url}")
        print(f"\nProduct ID: {product.id}")
        print(f"Price: $49.00")
        print(f"Price ID: {price.id}")

        print("\n" + "=" * 70)
        print("NEXT STEPS:")
        print("=" * 70)
        print("\n1. Test the payment link above")
        print("2. Update index.html with the payment link")
        print("3. Set up download delivery (success page)")
        print("4. Deploy and test full flow")

        # Save payment link to file for reference
        output_file = Path(__file__).parent.parent / 'STRIPE_PAYMENT_LINK.txt'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"Know Your Homebook - Stripe Payment Link\n")
            f.write(f"=========================================\n\n")
            f.write(f"Payment URL: {payment_url}\n")
            f.write(f"Product ID: {product.id}\n")
            f.write(f"Price ID: {price.id}\n")
            f.write(f"Amount: $49.00\n")
            f.write(f"Mode: {'LIVE' if is_live else 'TEST'}\n")

        print(f"\nDetails saved to: {output_file}")

        return payment_url

    except stripe.error.AuthenticationError:
        print("   [ERROR] Invalid API key. Check your STRIPE_SECRET_KEY.")
        return None
    except Exception as e:
        print(f"   [ERROR] {e}")
        return None


if __name__ == "__main__":
    create_homebook_payment()
