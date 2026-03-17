import pandas as pd


def validate_phone(number):
    number=str(number).strip()
    if number.startswith("91") and len(number)==12 and number.isdigit():
        return True
    return False


def load_contacts(csv_file):
    try:
        df=pd.read_csv(csv_file)
    except Exception:
        raise ValueError("invalid CSV file")
    if df.empty:
        raise ValueError("csv file is empty")
    if "phone_number" not in df.columns:
        raise ValueError("csv file must contain 'phone_number' column")
    valid=[]
    invalid=[]
    for index,row in df.iterrows():
        phone=str(row["phone_number"]).strip()
        if validate_phone(phone):
            valid.append(phone)
        else:
            invalid.append({"row": index+2, "phone_number": phone})
    return valid,invalid