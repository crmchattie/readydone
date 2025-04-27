"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ChevronRight,
  Mail,
  Clock,
  DollarSign,
  BarChart,
  CheckCircle,
  Star,
  Car,
  MessageSquare,
  Shield,
  Search,
  FileText,
  Table
} from "lucide-react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

export default function LandingPageClient() {
  const { status } = useSession()
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [userCount, setUserCount] = useState<number | null>(null)

  const monthlyPrice = 20
  const yearlyPrice = 200 // 10 months for the price of 12
  const savingsPerYear = 40

  useEffect(() => {
    console.log("LandingPage: useEffect running")
    async function fetchUserCount() {
      console.log("LandingPage: fetchUserCount starting")
      try {
        console.log("LandingPage: Making fetch request to /api/users/count")
        const response = await fetch('/api/users/count')
        console.log("LandingPage: Response received:", response.status)
        if (!response.ok) {
          const text = await response.text()
          console.error("LandingPage: Response not OK:", response.status, text)
          return
        }
        const data = await response.json()
        console.log("LandingPage: Data received:", data)
        setUserCount(data.count)
      } catch (error) {
        console.error('LandingPage: Failed to fetch user count:', error)
      }
    }

    fetchUserCount()
  }, [])

  const getStartedLink = status === "authenticated" ? "/" : "/register"

  const testimonials = [
    {
      name: "Sarah K.",
      role: "Car Buyer",
      quote:
        "Plot saved me hours of research and emails. I got competitive quotes from 5 dealerships without the usual back-and-forth hassle. The AI even helped me compare the offers!",
      savings: "5+ hours saved",
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      name: "Mike R.",
      role: "Insurance Shopper",
      quote: "Getting insurance quotes used to be a nightmare. Plot contacted multiple providers and organized all the responses. I found better coverage for less money.",
      savings: "$400/year",
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      name: "Jessica T.",
      role: "Event Planner",
      quote:
        "As a wedding planner, I use Plot to reach out to vendors and venues. It saves me so much time on initial outreach and keeps all the responses organized.",
      savings: "10+ hours/week",
      image: "/placeholder.svg?height=80&width=80",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-background/50 to-background">
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=1080&width=1920')] bg-cover bg-center opacity-5"></div>
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 lg:gap-16">
            <div className="max-w-2xl space-y-5">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
                <Star className="mr-1 size-4" /> Trusted by {userCount ? `${Number(userCount) + 100}+` : '100+'} users
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Get Things Done with
                <span className="block text-primary mt-2">AI-Powered Task Completion</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                From research to outreach, document creation to deal negotiation — Readydone handles complex tasks while you focus on making decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="font-medium px-8">
                  <Link href={getStartedLink}>
                    Get Started Free
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-medium">
                  <Link href="#how-it-works">How It Works</Link>
                </Button>
                {/* <Button asChild variant="outline" size="lg" className="font-medium">
                  <Link href="/examples">See Examples</Link>
                </Button> */}
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium mr-2">
                  Simple Pricing
                </span>
                <span>Free plan available, or ${monthlyPrice}/month for unlimited tasks</span>
              </div>
            </div>

            <div className="relative w-full md:w-5/12 h-[450px] mt-10 md:mt-0">
              <div className="w-[90%] md:w-[480px] h-[450px] mx-auto md:mx-0 rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
                <div className="relative size-full p-6">
                  <div className="absolute top-0 inset-x-0 h-12 bg-muted rounded-t-3xl flex items-center px-4">
                    <div className="flex space-x-2">
                      <div className="size-3 rounded-full bg-red-400"></div>
                      <div className="size-3 rounded-full bg-yellow-400"></div>
                      <div className="size-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="mx-auto font-medium text-muted-foreground">AI Assistant</div>
                  </div>

                  <div className="mt-14 space-y-6">
                    <div className="p-4 bg-primary/5 rounded-lg border border-border">
                      <div className="flex items-center mb-3">
                        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Search className="size-5 text-primary" />
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold">Smart Search</h3>
                          <p className="text-sm text-gray-500">Finding relevant information...</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full w-[45%]"></div>
                      </div>
                    </div>

                    <div className="p-4 bg-card rounded-lg border border-border shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Email Responses</div>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">3 of 5</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Source A</span>
                          <span className="font-medium text-green-600">Replied</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Source B</span>
                          <span className="font-medium text-green-600">Replied</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Source C</span>
                          <span className="font-medium text-green-600">Replied</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/30">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="size-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="font-medium text-green-800 dark:text-green-300">Time Saved: 2.5 hours</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400">All responses organized and summarized</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {userCount ? `${Number(userCount) + 100}+` : '100+'}
              </div>
              <div className="text-muted-foreground">Happy Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">1000+</div>
              <div className="text-muted-foreground">Hours Saved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">4.8/5</div>
              <div className="text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">10+</div>
              <div className="text-muted-foreground">Use Cases</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Simple 3-Step Process
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Our AI-powered platform handles your outreach and negotiations from start to finish in just a few simple steps.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div className="flex flex-col items-center text-center relative">
                <div className="size-16 bg-primary rounded-full flex items-center justify-center mb-6 z-10">
                  <span className="text-primary-foreground font-bold text-xl">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Describe Your Need</h3>
                <p className="text-muted-foreground mb-6">
                  Tell the AI what you&apos;re looking for - whether it&apos;s car dealers, insurance providers, event vendors, or any other providers you need to coordinate with.
                </p>
                <div className="p-4 bg-card rounded-lg shadow-sm border border-border w-full h-[200px] flex flex-col">
                  <div className="flex items-center mb-3">
                    <MessageSquare className="size-5 text-primary mr-2" />
                    <span className="font-medium">Chat with AI</span>
                  </div>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Task:</span>
                      <span>Find & Compare Options</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>Car Shopping</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-green-600">In Progress</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center text-center relative">
                <div className="size-16 bg-primary rounded-full flex items-center justify-center mb-6 z-10">
                  <span className="text-primary-foreground font-bold text-xl">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">AI Takes Action</h3>
                <p className="text-muted-foreground mb-6">
                  The AI finds relevant providers, crafts personalized messages, and manages all communication through your connected accounts.
                </p>
                <div className="p-4 bg-card rounded-lg shadow-sm border border-border w-full h-[200px] flex flex-col">
                  <div className="flex items-center mb-3">
                    <Mail className="size-5 text-primary mr-2" />
                    <span className="font-medium">Email Management</span>
                  </div>
                  <div className="space-y-2 text-sm text-left grow">
                    <p className="text-muted-foreground">
                      All emails are sent and received through your Gmail account, with the AI handling the communication flow.
                    </p>
                    <div className="flex items-center justify-center mt-4">
                      <div className="size-8 bg-gray-100 rounded flex items-center justify-center mr-2">
                        <Search className="size-4 text-gray-500" />
                      </div>
                      <div className="h-0.5 w-4 bg-gray-300"></div>
                      <div className="size-8 bg-primary/10 rounded flex items-center justify-center mx-2">
                        <Mail className="size-4 text-primary" />
                      </div>
                      <div className="h-0.5 w-4 bg-gray-300"></div>
                      <div className="size-8 bg-green-100 rounded flex items-center justify-center ml-2">
                        <MessageSquare className="size-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center text-center relative">
                <div className="size-16 bg-primary rounded-full flex items-center justify-center mb-6 z-10">
                  <span className="text-primary-foreground font-bold text-xl">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Stay Organized</h3>
                <p className="text-muted-foreground mb-6">
                  All information and responses are automatically organized into clear summaries, with helpful docs and spreadsheets to track everything.
                </p>
                <div className="p-4 bg-card rounded-lg shadow-sm border border-border w-full h-[200px] flex flex-col">
                  <div className="flex items-center mb-3">
                    <FileText className="size-5 text-primary mr-2" />
                    <span className="font-medium">Task Progress</span>
                  </div>
                  <div className="space-y-2 text-sm text-left grow">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="size-4 text-green-600" />
                      <span>Research Complete</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="size-4 text-green-600" />
                      <span>Documents Created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-primary" />
                      <span>Outreach In Progress</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features, Pricing, Testimonials, etc. sections remain the same */}
      {/* ... continuing the rest of the sections from the original page component */}

      {/* Pricing Section */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Simple Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">Start with our free plan or upgrade for unlimited features.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden transition-all hover:scale-105">
              <div className="p-8 text-center">
                <h3 className="text-2xl font-bold">Free Plan</h3>
                <div className="mt-6 flex items-center justify-center">
                  <div className="flex items-baseline">
                    <span className="text-6xl font-bold">$0</span>
                    <span className="ml-2 text-gray-500">/month</span>
                  </div>
                </div>
                <p className="mt-4 text-muted-foreground">Perfect for trying out the platform</p>
              </div>

              <div className="border-t border-border bg-muted/50 px-8 py-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      Up to <strong>3 tasks</strong> per month
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      Basic email templates
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      Simple organization tools
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      Community support
                    </span>
                  </li>
                </ul>

                <Button asChild className="w-full mt-8" size="lg" variant="outline">
                  <Link href={getStartedLink}>Get Started Free</Link>
                </Button>
              </div>
            </div>

            <div className="bg-card border-2 border-primary rounded-xl shadow-xl overflow-hidden transition-all hover:scale-105">
              <div className="p-8 text-center">
                <h3 className="text-2xl font-bold">Pro Plan</h3>
                <div className="mt-6 flex items-center justify-center">
                  <div className="flex items-baseline">
                    <span className="text-6xl font-bold">${monthlyPrice}</span>
                    <span className="ml-2 text-gray-500">/month</span>
                  </div>
                </div>
                <p className="mt-4 text-muted-foreground">Everything you need for serious business outreach</p>
              </div>

              <div className="border-t border-border bg-muted/50 px-8 py-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      <strong>Unlimited</strong> tasks
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      Advanced AI email personalization
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      Smart docs and spreadsheets
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="size-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                    <span>
                      Priority support
                    </span>
                  </li>
                </ul>

                <Button asChild className="w-full mt-8" size="lg">
                  <Link href={`${getStartedLink}?plan=pro`}>Upgrade to Pro</Link>
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Save ${savingsPerYear} with yearly billing
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Powerful Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
            <p className="text-xl text-muted-foreground">
              Our platform is designed to save you time and hassle on any outreach or negotiation task.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start">
                <div className="mr-5 mt-1">
                  <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="size-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">AI Task Chat</h3>
                  <p className="text-muted-foreground">
                    Simply describe what you need in natural language. Our AI understands your goal, creates a plan, and takes action on your behalf.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start">
                <div className="mr-5 mt-1">
                  <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Search className="size-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">Smart Search & Outreach</h3>
                  <p className="text-muted-foreground">
                    Our AI finds the right information and contacts, then manages professional communication through your email to get things done.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start">
                <div className="mr-5 mt-1">
                  <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="size-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">Smart Documents & Spreadsheets</h3>
                  <p className="text-muted-foreground">
                    Every task comes with AI-generated documents and spreadsheets to track information, compare options, and organize your workflow.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start">
                <div className="mr-5 mt-1">
                  <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="size-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">Integrated Email Flow</h3>
                  <p className="text-muted-foreground">
                    Securely connect your Gmail to let our AI manage professional communications, with all responses organized in clear threads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Customer Stories
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-xl text-muted-foreground">
              Hear from people who&apos;ve already used our platform to save time and money.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-muted/50 rounded-2xl p-8 md:p-12 shadow-sm border border-border relative overflow-hidden">
              <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-bl-full"></div>

              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
                  <h4 className="text-xl font-semibold">{testimonials[activeTestimonial].name}</h4>
                  <p className="text-muted-foreground mb-2">{testimonials[activeTestimonial].role}</p>
                  <div className="flex items-center">
                    <Star className="size-4 text-yellow-400 fill-yellow-400" />
                    <Star className="size-4 text-yellow-400 fill-yellow-400" />
                    <Star className="size-4 text-yellow-400 fill-yellow-400" />
                    <Star className="size-4 text-yellow-400 fill-yellow-400" />
                    <Star className="size-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="mt-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                    Saved {testimonials[activeTestimonial].savings}
                  </div>
                </div>

                <div className="w-full md:w-2/3">
                  <div className="relative">
                    <div className="text-4xl text-primary/20 absolute -top-6 -left-2">&ldquo;</div>
                    <p className="text-lg text-muted-foreground italic relative z-10">
                      {testimonials[activeTestimonial].quote}
                    </p>
                    <div className="text-4xl text-primary/20 absolute -bottom-10 -right-2">&rdquo;</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-8 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`size-2.5 rounded-full ${index === activeTestimonial ? "bg-primary" : "bg-gray-300"}`}
                    aria-label={`View testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Common Questions
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">Everything you need to know about our car negotiation service</p>
          </div>

          <div className="max-w-3xl mx-auto grid gap-6">
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer">
                  <h3 className="text-lg font-medium">How much does the service cost?</h3>
                  <span className="ml-6 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                    <ChevronRight className="size-5 rotate-90" />
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground">
                    Our service costs {userCount && userCount < 1000 ? (
                      <>
                        <span className="line-through">${yearlyPrice}</span>{" "}
                        <span>${yearlyPrice}</span>
                      </>
                    ) : (
                      `$${yearlyPrice}`
                    )} per car search. There are no recurring charges or hidden fees.
                    You pay once and get access to all features including AI-powered negotiation, dealer outreach, and
                    response tracking.
                  </p>
                </div>
              </details>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer">
                  <h3 className="text-lg font-medium">How much can I expect to save?</h3>
                  <span className="ml-6 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                    <ChevronRight className="size-5 rotate-90" />
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground">
                    Our customers save an average of $1,500+ on their car purchases and 5+ hours of their time. By reaching out to multiple
                    dealerships simultaneously and creating a competitive environment, we help you secure the best
                    possible price for your desired vehicle.
                  </p>
                </div>
              </details>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer">
                  <h3 className="text-lg font-medium">Is my data secure?</h3>
                  <span className="ml-6 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                    <ChevronRight className="size-5 rotate-90" />
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground">
                    Yes, your privacy is our top priority. We handle all communications through our secure platform, keeping your personal email private and free from spam. You&apos;ll only receive important updates through our dashboard.
                  </p>
                </div>
              </details>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer">
                  <h3 className="text-lg font-medium">How long does the process take?</h3>
                  <span className="ml-6 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                    <ChevronRight className="size-5 rotate-90" />
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground">
                    The initial setup takes about 5 minutes where you&apos;ll provide your preferences and connect your
                    email. After that, our AI begins reaching out immediately. Most users receive their first
                    responses within 24-48 hours, and the full process typically completes within 3-5 days.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary/5 dark:bg-primary/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=1080&width=1920')] bg-cover bg-center opacity-5"></div>
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to simplify your workflow?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start free and upgrade to Pro for ${monthlyPrice}/month when you need more. Let our AI handle the tedious work while you focus on what matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="px-8">
                <Link href={getStartedLink}>
                  Get Started Free
                  <ChevronRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#how-it-works">Learn More</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/examples">See Examples</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Join hundreds of users saving time with AI-powered outreach</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card text-muted-foreground border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-foreground font-semibold mb-4">Pages</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/login" className="hover:text-foreground transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-foreground transition-colors">
                    Register
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/examples" className="hover:text-foreground transition-colors">
                    Examples
                  </Link>
                </li>
              </ul>
            </div>
            <div className="text-center">
              <h3 className="text-foreground font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div className="text-center">
              <h3 className="text-foreground font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:support@plotliving.com" className="hover:text-foreground transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <Link href="/help" className="hover:text-foreground transition-colors">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-muted text-center text-sm">
            <p>© {new Date().getFullYear()} Plot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 