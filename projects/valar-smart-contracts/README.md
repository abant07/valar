# Valar Smart Contracts

This project contains the smart contracts for [Valar](https://stake.valar.solutions) - a decentralized platform for connecting blockchain stakeholders (i.e. `Delegators`) to node runners (i.e. `Validators`) that offer direct participation in blockchain consensus, i.e. staking.
The platform is based on the peer-to-peer direct staking approach.
The smart contracts contained in this project are the core of the Valar platform.
They provide decentralized advertising of node running services.
Moreover, they enable a streamlined collaboration between `Validators` and `Delegators` by defining and enforcing the collaboration terms, including payments integration.
More details about the platform can be found in [Valar: Platform Overview](../../Valar-Platform-Overview.pdf), including details about smart contract design and implementation in `Chapter 5`.

This `README` includes descriptions of:
1. Structure of this project.
2. Setup required to use this project in a local environment.
3. Tools used for development of this project.

This project has been generated using AlgoKit.

A public test deployment instance is available on `Algorand fnet` (ID: [`16246215`](https://lora.algokit.io/fnet/application/16246215)).


## 1. Structure

### Implementation

The Valar platform consists of three types of smart contracts: [`Noticeboard`](./smart_contracts/noticeboard/contract.py), [`ValidatorAd`](./smart_contracts/validator_ad/contract.py), and [`DelegatorContract`](./smart_contracts/delegator_contract/contract.py).
Their implementations are located in the folder [`./smart_contracts`](./smart_contracts/), which includes a subfolder for each smart contract.
Each smart contract subfolder contains a file for contract implementation (`contract.py`) and a file for constants related to that contract (`constants.py`).

Data types, structures and subroutines common to all three types of smart contracts are defined in [`./smart_contracts/helpers/common.py`](./smart_contracts/helpers/common.py).
Constants relevant to all smart contracts, including boxes' prefixes, names, sizes, MBR values, as well as notification and error messages are located in [`./smart_contracts/helpers/constants.py`](./smart_contracts/helpers/constants.py).

The compiled contracts are located in [`./smart_contracts/artifacts`](./smart_contracts/artifacts).

Deployment configuration is defined in [`./smart_contracts/noticeboard/deploy_config.py`](./smart_contracts/noticeboard/deploy_config.py).
Only `Noticeboard` has a deployment configuration as `ValidatorAd` and `DelegatorContract` are not meant to be deployed individually but get deployed from `Noticeboard` and `ValidatorAd`, respectively.

### Specifications

The smart contracts are implemented based on specifications located in the folder [`./specs`](./specs), which includes a file with specifications for each smart contract.
Each smart contract is designed as a state machine.

The specifications define:
- all the actions allowed in an individual state,
- conditions of when the action should succeed or fail, and
- the result of a successful action.

### Tests

The tests of the smart contracts are located in the folder [`./tests`](./tests), which includes a subfolder for each smart contract.
Each smart contract subfolder contains a separate file for test of each possible actions of the individual smart contract.
For `DelegatorContract`, an additional test (`state_transitions_test.py`) is included for testing all combinations of all actions and all possible states.

Testing of each smart contract follows the same general framework, which is based on the clients that are automatically generated by AlgoKit during build.
The clients (`client.py`) automatically generated for each smart contract are located in [`./smart_contracts/artifacts`](./smart_contracts/artifacts).
The testing framework expands on the generated clients with `client_helper.py`, which complements decoding of smart contract data structures for more convenient use; and with `utils.py`, which defines a class to simplify smart contract interactions by defining the intended actions (including supplying correct smart contract call references), guiding the smart contracts to a particular state, fetching information from the blockchain in a more convenient form, and simple switching between different users.
For each smart contract, the class defined in `utils.py` is to be used together with the `ActionInputs` class defined in the corresponding `config.py`, which serves to simplify testing by supporting a default configuration for actions and their individual modifications to enable intentional fails.

Each test file includes multiple tests relevant to the particular action under test.
This includes test cases that are meant to fail.
These failing tests are implemented only to test logic failures of the smart contracts.
They do not cover e.g. incorrect method calls or missing resources during the method calls.
Correct failures are asserted with the use of error messages that are added to the compiled smart contract but are not included in the bytecode.

Each test is independent, consisting of setting up the test via an `ActionInputs` object, guiding the contract(s) to the correct state(s), performing the action under the test, and evaluating the results.
All contracts and accounts used for interaction are setup anew for each test.
This is defined in the corresponding `conftest.py` file of each smart contract test subfolder.
Only a few general settings are shared among the tests, which are defined under [`./tests/conftest.py`](./tests/conftest.py).
These include a `dispenser` account and an `ASA` used for all the tests.
Some constants to report information about the tests and some common test functions are shared between all test.
They are located in [`./tests/constants.py`](./tests/constants.py) and [`./tests/utils.py`](./tests/utils.py), respectively.
*Note: Consensus suspension is emulated with an account close-out transaction because of current issues with getting the suspension mechanism working on localnet. This emulation also speeds up the tests.*

Each test is defined to run (at least) twice - once with `ALGO` as a payment method and once with the created `ASA`.
Some tests are not applicable to cases with `ALGO` as the payment method, thus are skipped.
This is reported during the testing.
Similarly, based on the smart contract logic, many tests are expected to have an equivalent result regardless whether the payment method is `ALGO` or `ASA` (in particular failing tests).
These are skipped for faster testing.
This is also reported during the testing.


## 2. Setup

### Pre-requisites

- [Python 3.12](https://www.python.org/downloads/) or later
- [Docker](https://www.docker.com/) (only required for LocalNet)

### Initial Setup

#### 1. Clone the Repository
Start by cloning this repository to your local machine.

#### 2. Install Pre-requisites
Ensure the following pre-requisites are installed and properly configured:

- **Docker**: Required for running a local Algorand network. [Install Docker](https://www.docker.com/).
- **AlgoKit CLI**: Essential for project setup and operations. Install the latest version from [AlgoKit CLI Installation Guide](https://github.com/algorandfoundation/algokit-cli#install). Verify installation with `algokit --version`, expecting `2.5.1` or later.

#### 3. Bootstrap Your Local Environment
Run the following commands within the project folder:

- **Install Poetry**: Required for Python dependency management. [Installation Guide](https://python-poetry.org/docs/#installation). Verify with `poetry -V` to see version `1.8.2`+.
- **Setup Project**: Execute `algokit project bootstrap all` to:
  - Install dependencies and setup a Python virtual environment in `.venv`.
  - Copy `.env.template` to `.env`.
- **Start LocalNet**: Use `algokit localnet start` to initiate a local Algorand network. *Note: AVM11 support is required. If localnet protocol version does not yet support it, [switch to future protocol version](https://fnet.algorand.green/docs/algokit-local-fnet/).* 

### Workflow

#### Terminal
Directly manage and interact with the project using AlgoKit commands:

1. **Build Contracts**: `algokit project run build` compiles all smart contracts.
2. **Deploy**: Use `algokit project deploy localnet` to deploy contracts to the local network.

#### VS Code 
For a seamless experience with breakpoint debugging and other features:

1. **Open Project**: In VS Code, open the repository root.
2. **Install Extensions**: Follow prompts to install recommended extensions.
3. **Debugging**:
   - Use `F5` to start debugging.
   - **Windows Users**: Select the Python interpreter at `./.venv/Scripts/python.exe` via `Ctrl/Cmd + Shift + P` > `Python: Select Interpreter` before the first run.

#### Debugging Smart Contracts

This project is optimized to work with AlgoKit AVM Debugger extension. To activate it:
Refer to the commented header in the `__main__.py` file in the `smart_contracts` folder.

If you have opted in to include VSCode launch configurations in your project, you can also use the `Debug TEAL via AlgoKit AVM Debugger` launch configuration to interactively select an available trace file and launch the debug session for your smart contract.

For information on using and setting up the `AlgoKit AVM Debugger` VSCode extension refer [here](https://github.com/algorandfoundation/algokit-avm-vscode-debugger). To install the extension from the VSCode Marketplace, use the following link: [AlgoKit AVM Debugger extension](https://marketplace.visualstudio.com/items?itemName=algorandfoundation.algokit-avm-vscode-debugger).

#### Testing

To run the tests of all smart contracts, run `poetry run pytest -vv`.
All testing is done against the localnet instance of the blockchain.
The localnet instance should be set to `DevMode` (as is default for localnet) to speed up the testing.
See section [Tests](#tests) for a description of the tests.

## 3. Tools

This project makes use of Algorand Python to build Algorand smart contracts. The following tools are in use:

- [Algorand](https://www.algorand.com/) - Layer 1 Blockchain; [Developer portal](https://developer.algorand.org/), [Why Algorand?](https://developer.algorand.org/docs/get-started/basics/why_algorand/)
- [AlgoKit](https://github.com/algorandfoundation/algokit-cli) - One-stop shop tool for developers building on the Algorand network; [docs](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/algokit.md), [intro tutorial](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/tutorials/intro.md)
- [Algorand Python](https://github.com/algorandfoundation/puya) - A semantically and syntactically compatible, typed Python language that works with standard Python tooling and allows you to express smart contracts (apps) and smart signatures (logic signatures) for deployment on the Algorand Virtual Machine (AVM); [docs](https://github.com/algorandfoundation/puya), [examples](https://github.com/algorandfoundation/puya/tree/main/examples)
- [AlgoKit Utils](https://github.com/algorandfoundation/algokit-utils-py) - A set of core Algorand utilities that make it easier to build solutions on Algorand.
- [Poetry](https://python-poetry.org/): Python packaging and dependency management.
- [Black](https://github.com/psf/black): A Python code formatter.
- [Ruff](https://github.com/charliermarsh/ruff): An extremely fast Python linter.
- [mypy](https://mypy-lang.org/): Static type checker.
- [pytest](https://docs.pytest.org/): Automated testing.
- [pip-audit](https://pypi.org/project/pip-audit/): Tool for scanning Python environments for packages with known vulnerabilities.

