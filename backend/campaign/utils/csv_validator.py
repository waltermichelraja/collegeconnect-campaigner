import pandas as pd


def validate_phone(number):
    number=str(number)
    if number.startswith("91") and len(number)==12 and number.isdigit():
        return True
    return False


def load_contacts(csv_file):
    df=pd.read_csv(csv_file)
    valid=[]
    invalid=[]
    for _, row in df.iterrows():
        phone=str(row["phone"])
        if validate_phone(phone):
            valid.append(phone)
        else:
            invalid.append(phone)
    return valid,invalid