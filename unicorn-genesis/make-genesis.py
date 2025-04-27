import json
import csv
import os
from collections import defaultdict

# Configuration
CHAIN_ID = "unicorn-69"  # chain ID
GENESIS_TIME = "2025-05-27T00:00:00Z"  # Genesis time in RFC3339
VALIDATOR_ADDRESS = "unicornvaloper1..."  # Replace with your validator operator address
OUTPUT_FILE = "genesis.json"
STAKING_DENOM = "uwunicorn"
EXCLUDE_POOL_BALANCES = False  # Set to True to exclude pool balances from supply validation

# Initialize genesis structure
genesis = {
    "genesis_time": GENESIS_TIME,
    "chain_id": CHAIN_ID,
    "initial_height": "1",
    "consensus_params": {
        "block": {"max_bytes": "22020096", "max_gas": "-1", "time_iota_ms": "1000"},
        "evidence": {
            "max_age_num_blocks": "100000",
            "max_age_duration": "172800000000000",
            "max_bytes": "1048576",
        },
        "validator": {"pub_key_types": ["ed25519"]},
        "version": {},
    },
    "app_hash": "",
    "app_state": {
        "auth": {"accounts": []},
        "bank": {"balances": [], "supply": [], "denom_metadata": []},
        "staking": {
            "delegations": [],
            "validators": [],  # Add validator details if needed
            "last_total_power": "0",
            "last_validator_powers": [],
            "exported": False,
        },
        "gamm": {"pools": [], "next_pool_id": "1"},
    },
}

# Read CSV files
def read_csv(file_path, required_columns=None):
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found")
        return []
    with open(file_path, "r") as f:
        reader = csv.DictReader(f)
        if required_columns:
            for col in required_columns:
                if col not in reader.fieldnames:
                    print(f"Error: Missing column {col} in {file_path}")
                    return []
        return [row for row in reader]

# Load CSV data
balances_data = read_csv("balances.csv")
lp_bals_data = read_csv("lp_bals.csv")
pool_bals_data = read_csv("pool_bals.csv", ["denom", "uwu", "meme"])
total_lps_data = read_csv("total_lps.csv", ["denom", "shares"])
supply_data = read_csv("supply.csv", ["denom", "amount"])
kaway_bond_data = read_csv("kaway_bond.csv", ["address", "uwu"])
uwuval_bond_data = read_csv("uwuval_bond.csv", ["address", "uwu"])
kaway_unbond_data = read_csv("kaway_unbond.csv", ["address", "uwu"])
uwuval_unbond_data = read_csv("uwuval_unbond.csv", ["address", "uwu"])

# Aggregate balances by address
address_balances = defaultdict(lambda: defaultdict(int))  # Regular token balances
address_lp_balances = defaultdict(lambda: defaultdict(int))  # LP share balances

# Process token balances
for row in balances_data:
    addr = row["address"]
    for denom, amount in row.items():
        if denom == "address":
            continue
        try:
            amount = int(amount)
            if amount > 0:
                address_balances[addr][denom] += amount
        except ValueError:
            print(f"Invalid balance for {addr}, denom {denom}: {amount}")

# Process LP contributions and calculate shares
lp_shares_total = defaultdict(int)  # Track total calculated LP shares per denom
total_denom_contributions = defaultdict(int)  # Track total denom token contributions for LP shares
pool_totals = {row["denom"]: {"uwunicorn": int(row["uwu"]), "denom_token": int(row["meme"])} for row in pool_bals_data}
total_shares = {row["denom"]: int(row["shares"]) for row in total_lps_data}  # Total LP shares

# First pass: Sum contributions for LP shares
for row in lp_bals_data:
    addr = row["address"]
    for denom, amount in row.items():
        if denom == "address":
            continue
        try:
            user_denom_token = int(amount)  # Amount of denom token (e.g., uheart) contributed for LP shares
            if user_denom_token > 0:
                total_denom_contributions[denom] += user_denom_token
        except ValueError:
            print(f"Invalid denom token contribution for {addr}, denom {denom}: {amount}")

# Second pass: Calculate LP shares using sum of contributions
for row in lp_bals_data:
    addr = row["address"]
    for denom, amount in row.items():
        if denom == "address":
            continue
        lp_denom = f"{denom}_lp_shares"  # Append _lp_shares for LP shares
        try:
            user_denom_token = int(amount)  # Amount of denom token (e.g., uheart) contributed
            if user_denom_token > 0:
                if denom not in pool_totals or pool_totals[denom]["denom_token"] == 0 or pool_totals[denom]["uwunicorn"] == 0:
                    print(f"Warning: No pool data or zero denom token/uwunicorn for {denom}, skipping")
                    continue
                if denom not in total_shares:
                    print(f"Warning: No total shares for {denom}, skipping")
                    continue
                # Calculate equivalent uwunicorn contribution using pool's price ratio
                pool_uwunicorn = pool_totals[denom]["uwunicorn"]
                pool_denom_token = pool_totals[denom]["denom_token"]
                price_ratio = pool_uwunicorn / pool_denom_token  # uwunicorn per denom_token
                user_uwunicorn = user_denom_token * price_ratio
                # Calculate LP shares: (user_denom_token / sum_user_denom_token) * total_shares
                sum_user_denom_token = total_denom_contributions[denom]
                total_pool_shares = total_shares[denom]
                if sum_user_denom_token == 0:
                    print(f"Warning: Zero total contributions for {denom}, skipping")
                    continue
                user_shares = (user_denom_token / sum_user_denom_token) * total_pool_shares
                user_shares_int = int(user_shares)  # Round down to avoid fractional shares
                if user_shares_int > 0:
                    address_lp_balances[addr][lp_denom] += user_shares_int
                    lp_shares_total[denom] += user_shares_int
                    if addr == "unicorn1xrn5rg6gjmw409ry3meklnv84ua09z3a3pl372":
                        print(
                            f"Debug: Calculated {user_shares_int:,} {lp_denom} for {addr} from "
                            f"{user_denom_token:,} {denom} (inferred {user_uwunicorn:,.0f} uwunicorn, "
                            f"price ratio {price_ratio:.6f}, sum contributions {sum_user_denom_token:,})"
                        )
        except ValueError:
            print(f"Invalid denom token contribution for {addr}, denom {denom}: {amount}")

# Adjust for rounding errors
for denom in total_shares:
    if denom in lp_shares_total:
        calculated_total = lp_shares_total[denom]
        expected_total = total_shares[denom]
        if calculated_total != expected_total:
            difference = expected_total - calculated_total
            # Sort addresses by share amount to distribute remaining shares to largest contributors
            sorted_addresses = sorted(
                [(addr, address_lp_balances[addr][f"{denom}_lp_shares"])
                 for addr in address_lp_balances
                 if f"{denom}_lp_shares" in address_lp_balances[addr]],
                key=lambda x: x[1],
                reverse=True
            )
            # Distribute remaining shares to top contributors
            for i in range(min(int(difference), len(sorted_addresses))):
                addr = sorted_addresses[i][0]
                lp_denom = f"{denom}_lp_shares"
                address_lp_balances[addr][lp_denom] += 1
                lp_shares_total[denom] += 1
                if addr == "unicorn1xrn5rg6gjmw409ry3meklnv84ua09z3a3pl372":
                    print(f"Debug: Adjusted {addr} for {lp_denom} by +1 to correct rounding error")

# Validate LP shares against total_lps.csv
for denom, total in total_shares.items():
    if denom in lp_shares_total:
        calculated_total = lp_shares_total[denom]
        if calculated_total != total:
            print(
                f"Warning: LP shares mismatch for {denom}:\n"
                f"         Expected: {total:>15,}\n"
                f"             Got: {calculated_total:>15,}"
            )
            print("         Per-address LP share contributions:")
            for addr in address_lp_balances:
                lp_denom = f"{denom}_lp_shares"
                if lp_denom in address_lp_balances[addr]:
                    shares = address_lp_balances[addr][lp_denom]
                    print(f"           {addr}: {shares:>15,}")
        else:
            print(f"Info: LP shares match for {denom}: {calculated_total:,}")

# Validate total token supply against supply.csv
for row in supply_data:
    denom = row["denom"]
    try:
        max_supply = int(row["amount"])
        # Calculate total supply from addresses and pools
        address_total = sum(
            address_balances[addr][denom] for addr in address_balances if denom in address_balances[addr]
        )
        pool_total = 0
        if not EXCLUDE_POOL_BALANCES:
            if denom == STAKING_DENOM:  # uwunicorn
                pool_total = sum(
                    pool_totals[pool]["uwunicorn"] for pool in pool_totals
                )
            elif denom in pool_totals:  # denom token (e.g., uinternet)
                pool_total = pool_totals[denom]["denom_token"]
        total_supply = address_total + pool_total
        if total_supply > max_supply:
            overage = total_supply - max_supply
            overage_percent = (overage / max_supply) * 100
            print(
                f"Warning: Total supply exceeds maximum for {denom}:\n"
                f"         Maximum supply (supply.csv): {max_supply:>15,}\n"
                f"         Total supply: {total_supply:>15,}\n"
                f"         Overage: {overage:>15,} ({overage_percent:.2f}%)\n"
                f"         Address balances: {address_total:>15,} ({(address_total/total_supply)*100:.2f}%)\n"
                f"         Pool balances: {pool_total:>15,} ({(pool_total/total_supply)*100:.2f}%)\n"
                f"         Note: Pool balances {'excluded' if EXCLUDE_POOL_BALANCES else 'included'} in total supply."
            )
            print("         Per-address balances:")
            for addr in address_balances:
                if denom in address_balances[addr]:
                    balance = address_balances[addr][denom]
                    print(f"           {addr}: {balance:>15,} ({(balance/address_total)*100:.2f}% of address total)")
            if denom in pool_totals and not EXCLUDE_POOL_BALANCES:
                print(f"         Pool contribution for {denom}: {pool_total:>15,}")
        else:
            print(f"Info: Total supply valid for {denom}: {total_supply:,} (maximum {max_supply:,})")
    except ValueError:
        print(f"Invalid supply for denom {denom}: {row['amount']}")

# Process accounts and bank balances
accounts = []
bank_balances = []
total_supply_dict = defaultdict(int)

for addr in set(address_balances.keys()) | set(address_lp_balances.keys()):
    # Add to auth.accounts
    accounts.append(
        {
            "@type": "/cosmos.auth.v1beta1.BaseAccount",
            "address": addr,
            "pub_key": None,
            "account_number": "0",
            "sequence": "0",
        }
    )

    # Combine regular and LP balances
    coins = []
    # Regular tokens
    regular_denoms = address_balances[addr].keys()
    for denom in regular_denoms:
        amount = address_balances[addr][denom]
        coins.append({"denom": denom, "amount": str(amount)})
        total_supply_dict[denom] += amount
    # LP shares
    lp_denoms = address_lp_balances[addr].keys()
    for lp_denom in lp_denoms:
        amount = address_lp_balances[addr][lp_denom]
        coins.append({"denom": lp_denom, "amount": str(amount)})
        total_supply_dict[lp_denom] += amount

    # Debugging: Warn if address has only LP shares or missing expected tokens
    # if not regular_denoms and lp_denoms:
    #     print(f"Warning: Address {addr} has only LP shares, no regular tokens")
    if addr == "unicorn1xrn5rg6gjmw409ry3meklnv84ua09z3a3pl372":
        print(f"Debug: Balances for {addr}:")
        print(f"  Regular tokens: {list(regular_denoms)}")
        print(f"  LP shares: {list(lp_denoms)}")

    bank_balances.append({"address": addr, "coins": coins})

# Override total supply with supply.csv
for row in supply_data:
    try:
        amount = int(row["amount"])
        total_supply_dict[row["denom"]] = amount
    except ValueError:
        print(f"Invalid supply for denom {row['denom']}: {row['amount']}")

# Process delegations
delegations = []
for row in kaway_bond_data + uwuval_bond_data:
    addr = row["address"]
    try:
        amount = int(row["uwu"])
        if amount > 0:
            delegations.append(
                {
                    "delegator_address": addr,
                    "validator_address": VALIDATOR_ADDRESS,
                    "shares": f"{amount}.000000000000000000",
                }
            )
    except ValueError:
        print(f"Invalid bonded amount for {addr}: {row['uwu']}")

# Process unbonding delegations (if any)
unbonding_delegations = []
for row in kaway_unbond_data + uwuval_unbond_data:
    addr = row["address"]
    try:
        amount = int(row["uwu"])
        if amount > 0:
            unbonding_delegations.append(
                {
                    "delegator_address": addr,
                    "validator_address": VALIDATOR_ADDRESS,
                    "entries": [
                        {
                            "creation_height": "0",
                            "completion_time": GENESIS_TIME,
                            "initial_balance": str(amount),
                            "balance": str(amount),
                        }
                    ],
                }
            )
    except ValueError:
        print(f"Invalid unbonded amount for {addr}: {row['uwu']}")

# Process liquidity pools
pools = []
pool_id = 1
for pool_row in pool_bals_data:
    denom = pool_row["denom"]
    try:
        uwunicorn_amount = int(pool_row["uwu"])
        denom_token_amount = int(pool_row["meme"])  # Assume meme is the denom token
    except ValueError:
        print(f"Invalid pool amounts for {denom}: uwunicorn={pool_row['uwu']}, denom_token={pool_row['meme']}")
        continue

    # Use calculated shares for total_shares
    shares = lp_shares_total.get(denom, 0)
    if shares == 0:
        print(f"Warning: No shares calculated for pool {denom}")
        continue

    # Create pool
    pool = {
        "@type": "/osmosis.gamm.v1beta1.Pool",
        "id": str(pool_id),
        "pool_assets": [
            {"token": {"denom": STAKING_DENOM, "amount": str(uwunicorn_amount)}, "weight": "1"},
            {"token": {"denom": denom, "amount": str(denom_token_amount)}, "weight": "1"},  # Use pool denom
        ],
        "total_shares": {"denom": denom, "amount": str(shares)},
        "pool_params": {
            "swap_fee": "0.003000000000000000",
            "exit_fee": "0.000000000000000000",
        },
    }
    pools.append(pool)
    pool_id += 1

# Update genesis app_state
genesis["app_state"]["auth"]["accounts"] = accounts
genesis["app_state"]["bank"]["balances"] = bank_balances
genesis["app_state"]["bank"]["supply"] = [
    {"denom": denom, "amount": str(amount)} for denom, amount in total_supply_dict.items()
]
genesis["app_state"]["staking"]["delegations"] = delegations
genesis["app_state"]["staking"]["unbonding_delegations"] = unbonding_delegations
genesis["app_state"]["gamm"]["pools"] = pools
genesis["app_state"]["gamm"]["next_pool_id"] = str(pool_id)

# Write genesis file
with open(OUTPUT_FILE, "w") as f:
    json.dump(genesis, f, indent=2)

print(f"Genesis file generated: {OUTPUT_FILE}")