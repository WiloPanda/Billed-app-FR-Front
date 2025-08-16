/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js"
import NewBill from "../containers/NewBill.js";
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";
import Bills from "../containers/Bills.js"
import ErrorPage from "../views/ErrorPage.js"

global.fetch = jest.fn()
jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon.classList.contains('active-icon')).toBe(true)

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    test("Then on click on new bill I should be redirected to NewBill page", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "employee@test.tld"
      }));

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      await waitFor(() => screen.getByTestId('btn-new-bill'));

      const billsContainer = new Bills({
        document,
        onNavigate: window.onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill);

      const newBillButton = screen.getByTestId('btn-new-bill');
      newBillButton.addEventListener('click', handleClickNewBill);
      userEvent.click(newBillButton);
      expect(handleClickNewBill).toHaveBeenCalled();
      await waitFor(() => screen.getByTestId('form-new-bill'));
      expect(screen.getByTestId('form-new-bill')).toBeTruthy();
    });
    test("Then on click on eye Icon a modal shall open", () => {
      Object.defineProperty(
        window,
        'localStorage',
        { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "employee@test.tld"
      }))
      $.fn.modal = jest.fn();
      document.body.innerHTML = BillsUI({ data: bills })
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES_PATH[pathname]
      }
      const billsContainer = new Bills({
        document,
        bills,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
      const handleClickIconEye = jest.fn(billsContainer.handleClickIconEye)
      const iconEye = screen.getAllByTestId('icon-eye')
      iconEye[0].addEventListener('click', handleClickIconEye(iconEye[0]))
      userEvent.click(iconEye[0])
      expect(handleClickIconEye).toHaveBeenCalled()
      const modaleFile = $('#modaleFile')
      expect(modaleFile).toBeTruthy()
    })
  })

  // test d'intégration GET Bills
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "employee@test.tld" }));
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByText("Mes notes de frais"))
      const billsTable = await screen.getByTestId("tbody")
      expect(billsTable).toBeTruthy()
      expect(screen.getByText("Mes notes de frais")).toBeTruthy()
    })

    describe("when getBills is called", () => {
      test("should return formatted bills if API call succeeds", async () => {
        const billsContainer = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage
        })

        const result = await billsContainer.getBills()

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        expect(result[0]).toHaveProperty("date")
        expect(result[0]).toHaveProperty("status")
        expect(result[0]).toHaveProperty("rowDate")
      })
      test("should return unformatted date if formatDate throws", async () => {
        const corruptedStore = {
          bills: () => ({
            list: () => Promise.resolve([
              { id: "bad-date", date: "invalid-date", status: "pending" }
            ])
          })
        }

        const billsContainer = new Bills({
          document,
          onNavigate: jest.fn(),
          store: corruptedStore,
          localStorage: window.localStorage
        })

        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { })

        const result = await billsContainer.getBills()

        expect(result[0].date).toBe("invalid-date")
        expect(consoleSpy).toHaveBeenCalled()
        consoleSpy.mockRestore()
      })
      test("should navigate to ErrorPage on API failure", async () => {
        const error = new Error("API error")
        const storeWithFailure = {
          bills: () => ({
            list: () => Promise.reject(error)
          })
        }

        const onNavigateMock = jest.fn()

        const billsContainer = new Bills({
          document,
          onNavigate: onNavigateMock,
          store: storeWithFailure,
          localStorage: window.localStorage
        })

        await expect(billsContainer.getBills()).rejects.toThrow("API error")

        expect(onNavigateMock).toHaveBeenCalledWith(ROUTES_PATH.ErrorPage, "API error")
      })
    })

    describe("When I navigate to Bills", () => {
      test("fetches bills from mock API GET", async () => {
        localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "employee@test.tld" }));
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.append(root)
        router()
        window.onNavigate(ROUTES_PATH.Bills)

        await waitFor(() => screen.getByText("Mes notes de frais"))
        expect(screen.getByText("Mes notes de frais")).toBeTruthy()
        expect(screen.getByTestId("tbody")).toBeTruthy()
      })

      describe("When an error occurs on API", () => {
        beforeEach(() => {
          jest.spyOn(mockStore, "bills")
          Object.defineProperty(
            window,
            'localStorage',
            { value: localStorageMock }
          )
          window.localStorage.setItem('user', JSON.stringify({
            type: 'Employee',
            email: "employee@test.tld"
          }))
          const root = document.createElement("div")
          root.setAttribute("id", "root")
          document.body.appendChild(root)
          router()
        })

        test("fetches bills from an API and fails with 404 message error", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              list: () => {
                return Promise.reject(new Error("Erreur 404"));
              },
            };
          });

          // Mock onNavigate pour capturer les deux paramètres
          window.onNavigate = jest.fn((pathname, errorMessage) => {
            if (pathname === ROUTES_PATH.ErrorPage) {
              // Simuler ErrorPage avec le message d'erreur passé en paramètre
              document.body.innerHTML = ErrorPage(errorMessage);
            }
          });

          window.onNavigate(ROUTES_PATH.Bills);

          const billsContainer = new Bills({
            document,
            onNavigate: window.onNavigate,
            store: mockStore,
            localStorage: window.localStorage
          });

          await billsContainer.getBills().catch(() => { });

          // Vérifier que la navigation a été appelée avec les bons paramètres
          expect(window.onNavigate).toHaveBeenCalledWith(ROUTES_PATH.ErrorPage, "Erreur 404");

          // Vérifier que le message d'erreur est affiché
          const message = screen.getByTestId("error-message");
          expect(message.textContent).toMatch(/404/);
        });

        test("fetches bills from an API and fails with 500 message error", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              list: () => {
                return Promise.reject(new Error("Erreur 500"));
              },
            };
          });

          window.onNavigate = jest.fn((pathname, errorMessage) => {
            if (pathname === ROUTES_PATH.ErrorPage) {
              document.body.innerHTML = ErrorPage(errorMessage);
            }
          });

          window.onNavigate(ROUTES_PATH.Bills);

          const billsContainer = new Bills({
            document,
            onNavigate: window.onNavigate,
            store: mockStore,
            localStorage: window.localStorage
          });

          await billsContainer.getBills().catch(() => { });

          expect(window.onNavigate).toHaveBeenCalledWith(ROUTES_PATH.ErrorPage, "Erreur 500");

          const message = screen.getByTestId("error-message");
          expect(message.textContent).toMatch(/500/);
        });
      })
    })
  })
})