/**
 * Integration tests for AuthModal component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import AuthModal from '../src/components/AuthModal'

// Mock axios
vi.mock('axios')

describe('AuthModal Component Integration', () => {
  const mockOnAuthSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Guest Login Flow', () => {
    it('should handle successful guest login', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          user: {
            id: 1,
            username: 'Guest_123',
            is_guest: true
          }
        }
      }
      axios.post.mockResolvedValue(mockResponse)

      render(<AuthModal onAuthSuccess={mockOnAuthSuccess} />)
      
      const guestButton = screen.getByText(/Continue as Guest/i)
      fireEvent.click(guestButton)

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/guest')
        )
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockResponse.data)
      })
    })

    it('should show error on guest login failure', async () => {
      axios.post.mockRejectedValue({
        response: { data: { detail: 'Guest login failed' } }
      })

      render(<AuthModal onAuthSuccess={mockOnAuthSuccess} />)
      
      const guestButton = screen.getByText(/Continue as Guest/i)
      fireEvent.click(guestButton)

      await waitFor(() => {
        expect(screen.getByText(/Guest login failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Registration Flow', () => {
    it('should handle successful registration', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          user: {
            id: 2,
            username: 'newuser',
            email: 'new@example.com',
            is_guest: false
          }
        }
      }
      axios.post.mockResolvedValue(mockResponse)

      render(<AuthModal onAuthSuccess={mockOnAuthSuccess} />)
      
      // Switch to register tab
      const registerTab = screen.getByText(/Register/i)
      fireEvent.click(registerTab)

      // Fill form
      const usernameInput = screen.getByPlaceholderText(/Username/i)
      const emailInput = screen.getByPlaceholderText(/Email/i)
      const passwordInput = screen.getByPlaceholderText(/Password/i)

      fireEvent.change(usernameInput, { target: { value: 'newuser' } })
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Submit
      const registerButton = screen.getByRole('button', { name: /Register/i })
      fireEvent.click(registerButton)

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/register'),
          expect.objectContaining({
            username: 'newuser',
            email: 'new@example.com',
            password: 'password123'
          })
        )
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockResponse.data)
      })
    })

    it('should show validation error when fields are empty', async () => {
      render(<AuthModal onAuthSuccess={mockOnAuthSuccess} />)
      
      // Switch to register tab
      const registerTab = screen.getByText(/Register/i)
      fireEvent.click(registerTab)

      // Try to submit without filling fields
      const registerButton = screen.getByRole('button', { name: /Register/i })
      fireEvent.click(registerButton)

      await waitFor(() => {
        expect(screen.getByText(/Please enter/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Login Flow', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          user: {
            id: 3,
            username: 'existinguser',
            is_guest: false
          }
        }
      }
      axios.post.mockResolvedValue(mockResponse)

      render(<AuthModal onAuthSuccess={mockOnAuthSuccess} />)
      
      // Switch to login tab
      const loginTab = screen.getByText(/^Login$/i)
      fireEvent.click(loginTab)

      // Fill form
      const usernameInput = screen.getByPlaceholderText(/Username/i)
      const passwordInput = screen.getByPlaceholderText(/Password/i)

      fireEvent.change(usernameInput, { target: { value: 'existinguser' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Submit
      const loginButton = screen.getByRole('button', { name: /Login/i })
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            username: 'existinguser',
            password: 'password123'
          })
        )
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockResponse.data)
      })
    })

    it('should show error on login failure', async () => {
      axios.post.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } }
      })

      render(<AuthModal onAuthSuccess={mockOnAuthSuccess} />)
      
      // Switch to login tab
      const loginTab = screen.getByText(/^Login$/i)
      fireEvent.click(loginTab)

      // Fill form
      const usernameInput = screen.getByPlaceholderText(/Username/i)
      const passwordInput = screen.getByPlaceholderText(/Password/i)

      fireEvent.change(usernameInput, { target: { value: 'wronguser' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })

      // Submit
      const loginButton = screen.getByRole('button', { name: /Login/i })
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', () => {
      render(<AuthModal onAuthSuccess={mockOnAuthSuccess} />)
      
      // Default should be guest
      expect(screen.getByText(/Continue as Guest/i)).toBeInTheDocument()

      // Click login tab
      const loginTab = screen.getByText(/^Login$/i)
      fireEvent.click(loginTab)
      expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument()

      // Click register tab
      const registerTab = screen.getByText(/Register/i)
      fireEvent.click(registerTab)
      expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument()

      // Back to guest tab
      const guestTab = screen.getByText(/Guest/i)
      fireEvent.click(guestTab)
      expect(screen.getByText(/Continue as Guest/i)).toBeInTheDocument()
    })
  })
})
