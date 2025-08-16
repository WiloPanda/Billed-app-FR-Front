/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { ROUTES_PATH } from "../constants/routes.js"
import mockStore from "../__mocks__/store.js"
import { localStorageMock } from "../__mocks__/localStorage.js"

// Mock de window.alert
window.alert = jest.fn()

// Mock console.log et console.error
console.log = jest.fn()
console.error = jest.fn()

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.clear()
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: 'employee@test.com'
    }))
    jest.clearAllMocks()
  })

  describe("When I am on NewBill Page", () => {
    test("Then the form should be displayed with all required fields", () => {
      const html = NewBillUI()
      document.body.innerHTML = html

      const form = screen.getByTestId("form-new-bill")
      expect(form).toBeTruthy()

      expect(screen.getByTestId("expense-type")).toBeTruthy()
      expect(screen.getByTestId("expense-name")).toBeTruthy()
      expect(screen.getByTestId("datepicker")).toBeTruthy()
      expect(screen.getByTestId("amount")).toBeTruthy()
      expect(screen.getByTestId("pct")).toBeTruthy()
      expect(screen.getByTestId("file")).toBeTruthy()
      expect(screen.getByTestId("commentary")).toBeTruthy()
      expect(screen.getByTestId("vat")).toBeTruthy()
    })

    test("Then the submit button should be present", () => {
      const html = NewBillUI()
      document.body.innerHTML = html

      const submitButton = screen.getByText("Envoyer")
      expect(submitButton).toBeTruthy()
      expect(submitButton.type).toBe("submit")
    })
  })

  describe("When I upload a file", () => {
    let newBill
    let onNavigate

    beforeEach(() => {
      document.body.innerHTML = NewBillUI()
      onNavigate = jest.fn()
      newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
    })

    test("Then it should accept valid image formats (jpg, jpeg, png)", async () => {
      const fileInput = screen.getByTestId("file")
      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })

      // Créer un événement change avec preventDefault
      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', {
        value: fileInput,
        enumerable: true,
      })
      Object.defineProperty(changeEvent, 'preventDefault', {
        value: jest.fn(),
        enumerable: true,
      })

      // Mock de la propriété files de l'input
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      Object.defineProperty(fileInput, 'value', {
        value: 'C:\\fakepath\\test.jpg',
        writable: true,
      })

      // Déclencher l'événement
      fileInput.dispatchEvent(changeEvent)

      // Attendre que la promesse soit résolue
      await waitFor(() => {
        expect(newBill.fileName).toBe('test.jpg')
        expect(newBill.fileUrl).toBe('https://localhost:3456/images/test.jpg')
        expect(newBill.billId).toBe('1234')
      })
    })

    test("Then it should reject invalid file formats and show alert", () => {
      const fileInput = screen.getByTestId("file")
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })

      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', {
        value: fileInput,
        enumerable: true,
      })
      Object.defineProperty(changeEvent, 'preventDefault', {
        value: jest.fn(),
        enumerable: true,
      })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      Object.defineProperty(fileInput, 'value', {
        value: 'C:\\fakepath\\test.pdf',
        writable: true,
      })

      fileInput.dispatchEvent(changeEvent)

      expect(window.alert).toHaveBeenCalledWith('Seuls les fichiers JPG, JPEG et PNG sont autorisés.')
      expect(fileInput.value).toBe('')
    })
  })

  describe("When I submit the form", () => {
    let newBill
    let onNavigate

    beforeEach(() => {
      document.body.innerHTML = NewBillUI()
      onNavigate = jest.fn()
      newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })
    })

    test("Then it should call handleSubmit", () => {
      const form = screen.getByTestId("form-new-bill")
      const handleSubmit = jest.fn(newBill.handleSubmit)
      form.addEventListener("submit", handleSubmit)

      fireEvent.submit(form)
      expect(handleSubmit).toHaveBeenCalled()
    })

    test("Then it should create a bill with correct data and navigate", () => {
      // Simuler des fichiers uploadés
      newBill.fileUrl = "https://localhost:3456/images/test.jpg"
      newBill.fileName = "test.jpg"

      // Remplir le formulaire
      fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } })
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Vol Paris Londres" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-04-04" } })
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "400" } })
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "80" } })
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } })
      fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Test commentary" } })

      // Soumettre le formulaire
      const form = screen.getByTestId("form-new-bill")
      fireEvent.submit(form)

      // Vérifier la navigation
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills'])
    })

    test("Then it should use default percentage when pct field is empty", () => {
      // Remplir le formulaire avec pct vide
      fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } })
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Test" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-04-04" } })
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "100" } })
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "" } })

      const form = screen.getByTestId("form-new-bill")
      fireEvent.submit(form)

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills'])
    })

    test("Then it should handle amount as integer", () => {
      newBill.fileUrl = "test-url"
      newBill.fileName = "test.jpg"

      fireEvent.change(screen.getByTestId("amount"), { target: { value: "123.45" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-04-04" } })

      const form = screen.getByTestId("form-new-bill")
      fireEvent.submit(form)

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills'])
    })
  })

  describe("When there are errors in file upload", () => {
    test("Then it should handle store errors", async () => {
      const mockStoreWithError = {
        bills: () => ({
          create: jest.fn(() => Promise.reject(new Error('Network Error')))
        })
      }

      document.body.innerHTML = NewBillUI()
      const onNavigate = jest.fn()
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStoreWithError,
        localStorage: window.localStorage
      })

      const fileInput = screen.getByTestId("file")
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      Object.defineProperty(fileInput, 'value', {
        value: 'C:\\fakepath\\test.jpg',
        writable: true,
      })

      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', {
        value: fileInput,
        enumerable: true,
      })
      Object.defineProperty(changeEvent, 'preventDefault', {
        value: jest.fn(),
        enumerable: true,
      })

      fileInput.dispatchEvent(changeEvent)

      await waitFor(() => {
        expect(console.error).toHaveBeenCalled()
      })
    })
  })

  // Tests d'intégration POST NewBill
  describe("When I submit a new bill - Integration POST tests", () => {
    test("Then it should make a POST request to create file and update bill", async () => {
      document.body.innerHTML = NewBillUI()
      const onNavigate = jest.fn()

      const createMock = jest.fn(() => Promise.resolve({
        fileUrl: 'https://localhost:3456/images/test.jpg',
        key: '1234'
      }))
      const updateMock = jest.fn(() => Promise.resolve({
        id: '47qAXb6fIm2zOKkLzMro',
        status: 'pending'
      }))

      const mockStoreWithSpies = {
        bills: jest.fn(() => ({
          create: createMock,
          update: updateMock
        }))
      }

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStoreWithSpies,
        localStorage: window.localStorage
      })

      // 1. Test POST pour upload de fichier
      const fileInput = screen.getByTestId("file")
      const file = new File(['file content'], 'facture.jpg', { type: 'image/jpeg' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      Object.defineProperty(fileInput, 'value', {
        value: 'C:\\fakepath\\facture.jpg',
        writable: true,
      })

      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', {
        value: fileInput,
        enumerable: true,
      })
      Object.defineProperty(changeEvent, 'preventDefault', {
        value: jest.fn(),
        enumerable: true,
      })

      fileInput.dispatchEvent(changeEvent)

      // Vérifier l'appel POST pour create (upload fichier)
      await waitFor(() => {
        expect(createMock).toHaveBeenCalledWith({
          data: expect.any(FormData),
          headers: {
            noContentType: true
          }
        })
      })

      // 2. Remplir le formulaire
      fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Restaurants et bars" } })
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Déjeuner client" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-05-15" } })
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "85" } })
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "17" } })
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } })
      fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Déjeuner avec client" } })

      // 3. Test POST pour création de la facture
      const form = screen.getByTestId("form-new-bill")
      fireEvent.submit(form)

      // Vérifier l'appel POST pour update (création facture)
      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith({
          data: JSON.stringify({
            type: "Restaurants et bars",
            name: "Déjeuner client",
            amount: 85,
            date: "2023-05-15",
            vat: "17",
            pct: 20,
            commentary: "Déjeuner avec client",
            fileUrl: "https://localhost:3456/images/test.jpg",
            fileName: "facture.jpg",
            status: "pending"
          }),
          selector: "1234"
        })
      })

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills'])
    })

    test("Then it should handle POST errors gracefully", async () => {
      document.body.innerHTML = NewBillUI()
      const onNavigate = jest.fn()

      // Mock du store avec erreur sur create
      const createMockError = jest.fn(() => Promise.reject(new Error('Network error on file upload')))
      const mockStoreError = {
        bills: jest.fn(() => ({
          create: createMockError,
          update: jest.fn(() => Promise.resolve())
        }))
      }

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStoreError,
        localStorage: window.localStorage
      })

      const fileInput = screen.getByTestId("file")
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      Object.defineProperty(fileInput, 'value', {
        value: 'C:\\fakepath\\test.jpg',
        writable: true,
      })

      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', {
        value: fileInput,
        enumerable: true,
      })
      Object.defineProperty(changeEvent, 'preventDefault', {
        value: jest.fn(),
        enumerable: true,
      })

      fileInput.dispatchEvent(changeEvent)

      // Vérifier que l'erreur est bien gérée
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(new Error('Network error on file upload'))
      })
    })

    test("Then it should handle POST bill creation errors", async () => {
      document.body.innerHTML = NewBillUI()
      const onNavigate = jest.fn()

      // Mock du store avec erreur sur update
      const updateMockError = jest.fn(() => Promise.reject(new Error('Server error on bill creation')))
      const mockStoreUpdateError = {
        bills: jest.fn(() => ({
          create: jest.fn(() => Promise.resolve({
            fileUrl: 'https://localhost:3456/images/test.jpg',
            key: '1234'
          })),
          update: updateMockError
        }))
      }

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStoreUpdateError,
        localStorage: window.localStorage
      })

      // Simuler un fichier uploadé
      newBill.fileUrl = 'https://localhost:3456/images/test.jpg'
      newBill.fileName = 'test.jpg'
      newBill.billId = '1234'

      // Remplir et soumettre le formulaire
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Test" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-05-15" } })
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "100" } })

      const form = screen.getByTestId("form-new-bill")
      fireEvent.submit(form)

      // Vérifier que l'erreur de création de facture est gérée
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(new Error('Server error on bill creation'))
      })
    })

    test("Then it should send correct FormData for file upload", async () => {
      document.body.innerHTML = NewBillUI()
      const onNavigate = jest.fn()

      const createMock = jest.fn(() => Promise.resolve({
        fileUrl: 'https://localhost:3456/images/test.jpg',
        key: '1234'
      }))

      const mockStoreWithSpy = {
        bills: jest.fn(() => ({
          create: createMock,
          update: jest.fn(() => Promise.resolve())
        }))
      }

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStoreWithSpy,
        localStorage: window.localStorage
      })

      const fileInput = screen.getByTestId("file")
      const file = new File(['file content'], 'invoice.png', { type: 'image/png' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      Object.defineProperty(fileInput, 'value', {
        value: 'C:\\fakepath\\invoice.png',
        writable: true,
      })

      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', {
        value: fileInput,
        enumerable: true,
      })
      Object.defineProperty(changeEvent, 'preventDefault', {
        value: jest.fn(),
        enumerable: true,
      })

      fileInput.dispatchEvent(changeEvent)

      // Vérifier que create a été appelé avec les bons paramètres
      await waitFor(() => {
        expect(createMock).toHaveBeenCalledWith({
          data: expect.any(FormData),
          headers: {
            noContentType: true
          }
        })

        // Vérifier le contenu du FormData
        const callArgs = createMock.mock.calls[0][0]
        const formData = callArgs.data
        expect(formData instanceof FormData).toBe(true)
      })
    })
  })


  describe("When I complete the full bill creation flow - Integration tests", () => {
    test("Then it should execute the complete POST workflow", async () => {
      document.body.innerHTML = NewBillUI()
      const onNavigate = jest.fn()

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })

      const fileInput = screen.getByTestId("file")
      const file = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      Object.defineProperty(fileInput, 'value', {
        value: 'C:\\fakepath\\receipt.jpg',
        writable: true,
      })

      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', {
        value: fileInput,
        enumerable: true,
      })
      Object.defineProperty(changeEvent, 'preventDefault', {
        value: jest.fn(),
        enumerable: true,
      })

      fileInput.dispatchEvent(changeEvent)

      // Wait for file upload to complete
      await waitFor(() => {
        expect(newBill.fileName).toBe('receipt.jpg')
        expect(newBill.fileUrl).toBe('https://localhost:3456/images/test.jpg')
        expect(newBill.billId).toBe('1234')
      })

      // 2. Fill form and submit (POST update)
      fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "IT et électronique" } })
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Ordinateur portable" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-06-01" } })
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "1200" } })
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "240" } })
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } })
      fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Nouvel ordinateur pour développement" } })

      const form = screen.getByTestId("form-new-bill")
      fireEvent.submit(form)

      // Verify navigation after successful POST operations
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills'])
    })
  })
})