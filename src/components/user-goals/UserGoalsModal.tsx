import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserGoals, 
  UserGoalsFormData, 
  PREDEFINED_TITLES, 
  PREDEFINED_INDUSTRIES, 
  PREDEFINED_BUSINESS_MODELS, 
  PREDEFINED_CITIES 
} from '@/types/userGoals';
import { X, Plus } from 'lucide-react';

interface UserGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goals: UserGoals) => void;
  initialGoals?: UserGoals;
}

export function UserGoalsModal({ isOpen, onClose, onSave, initialGoals }: UserGoalsModalProps) {
  const [formData, setFormData] = useState<UserGoalsFormData>({
    targetTitles: [],
    minimumSalary: '180000',
    companyMaturity: [],
    workType: [],
    industries: [],
    businessModels: [],
    dealBreakers: {
      workType: [],
      companyMaturity: [],
      salaryMinimum: ''
    },
    preferredCities: [],
    openToRelocation: true
  });

  const [customTitle, setCustomTitle] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [customBusinessModel, setCustomBusinessModel] = useState('');
  const [customCity, setCustomCity] = useState('');

  useEffect(() => {
    if (initialGoals) {
      setFormData({
        targetTitles: initialGoals.targetTitles,
        minimumSalary: initialGoals.minimumSalary.toString(),
        companyMaturity: initialGoals.companyMaturity,
        workType: initialGoals.workType,
        industries: initialGoals.industries,
        businessModels: initialGoals.businessModels,
      dealBreakers: {
        workType: initialGoals.dealBreakers.workType,
        companyMaturity: initialGoals.dealBreakers.companyMaturity,
        salaryMinimum: initialGoals.dealBreakers.salaryMinimum?.toString() || ''
      },
        preferredCities: initialGoals.preferredCities,
        openToRelocation: initialGoals.openToRelocation
      });
    }
  }, [initialGoals]);

  const handleSave = () => {
    const goals: UserGoals = {
      targetTitles: formData.targetTitles,
      minimumSalary: parseInt(formData.minimumSalary) || 0,
      companyMaturity: formData.companyMaturity,
      workType: formData.workType,
      industries: formData.industries,
      businessModels: formData.businessModels,
      dealBreakers: {
        workType: formData.dealBreakers.workType,
        companyMaturity: formData.dealBreakers.companyMaturity,
        salaryMinimum: formData.dealBreakers.salaryMinimum ? parseInt(formData.dealBreakers.salaryMinimum) : null
      },
      preferredCities: formData.preferredCities,
      openToRelocation: formData.openToRelocation
    };
    onSave(goals);
    onClose();
  };

  const addCustomItem = (type: 'title' | 'industry' | 'businessModel' | 'city', value: string) => {
    if (!value.trim()) return;
    
    const cleanValue = value.trim();
    switch (type) {
      case 'title':
        if (!formData.targetTitles.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, targetTitles: [...prev.targetTitles, cleanValue] }));
        }
        setCustomTitle('');
        break;
      case 'industry':
        if (!formData.industries.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, industries: [...prev.industries, cleanValue] }));
        }
        setCustomIndustry('');
        break;
      case 'businessModel':
        if (!formData.businessModels.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, businessModels: [...prev.businessModels, cleanValue] }));
        }
        setCustomBusinessModel('');
        break;
      case 'city':
        if (!formData.preferredCities.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, preferredCities: [...prev.preferredCities, cleanValue] }));
        }
        setCustomCity('');
        break;
    }
  };

  const removeItem = (type: 'title' | 'industry' | 'businessModel' | 'city', value: string) => {
    switch (type) {
      case 'title':
        setFormData(prev => ({ ...prev, targetTitles: prev.targetTitles.filter(item => item !== value) }));
        break;
      case 'industry':
        setFormData(prev => ({ ...prev, industries: prev.industries.filter(item => item !== value) }));
        break;
      case 'businessModel':
        setFormData(prev => ({ ...prev, businessModels: prev.businessModels.filter(item => item !== value) }));
        break;
      case 'city':
        setFormData(prev => ({ ...prev, preferredCities: prev.preferredCities.filter(item => item !== value) }));
        break;
    }
  };

  const togglePredefinedItem = (type: 'title' | 'industry' | 'businessModel' | 'city' | 'workType' | 'companyMaturity', value: string) => {
    switch (type) {
      case 'title':
        if (formData.targetTitles.includes(value)) {
          removeItem('title', value);
        } else {
          setFormData(prev => ({ ...prev, targetTitles: [...prev.targetTitles, value] }));
        }
        break;
      case 'industry':
        if (formData.industries.includes(value)) {
          removeItem('industry', value);
        } else {
          setFormData(prev => ({ ...prev, industries: [...prev.industries, value] }));
        }
        break;
      case 'businessModel':
        if (formData.businessModels.includes(value)) {
          removeItem('businessModel', value);
        } else {
          setFormData(prev => ({ ...prev, businessModels: [...prev.businessModels, value] }));
        }
        break;
      case 'city':
        if (formData.preferredCities.includes(value)) {
          removeItem('city', value);
        } else {
          setFormData(prev => ({ ...prev, preferredCities: [...prev.preferredCities, value] }));
        }
        break;
      case 'workType':
        if (formData.workType.includes(value)) {
          setFormData(prev => ({ ...prev, workType: prev.workType.filter(item => item !== value) }));
        } else {
          setFormData(prev => ({ ...prev, workType: [...prev.workType, value] }));
        }
        break;
      case 'companyMaturity':
        if (formData.companyMaturity.includes(value)) {
          setFormData(prev => ({ ...prev, companyMaturity: prev.companyMaturity.filter(item => item !== value) }));
        } else {
          setFormData(prev => ({ ...prev, companyMaturity: [...prev.companyMaturity, value] }));
        }
        break;
    }
  };

  const toggleDealBreaker = (type: 'workType' | 'companyMaturity' | 'salary') => {
    if (type === 'workType') {
      if (formData.dealBreakers.workType.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          dealBreakers: { 
            ...prev.dealBreakers, 
            workType: [] 
          }
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          dealBreakers: { 
            ...prev.dealBreakers, 
            workType: [...formData.workType] 
          }
        }));
      }
    } else if (type === 'companyMaturity') {
      if (formData.dealBreakers.companyMaturity.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          dealBreakers: { 
            ...prev.dealBreakers, 
            companyMaturity: [] 
          }
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          dealBreakers: { 
            ...prev.dealBreakers, 
            companyMaturity: [...formData.companyMaturity] 
          }
        }));
      }
    } else if (type === 'salary') {
      if (formData.dealBreakers.salaryMinimum) {
        setFormData(prev => ({ 
          ...prev, 
          dealBreakers: { 
            ...prev.dealBreakers, 
            salaryMinimum: '' 
          }
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          dealBreakers: { 
            ...prev.dealBreakers, 
            salaryMinimum: formData.minimumSalary || '180000'
          }
        }));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Career Goals</DialogTitle>
          <DialogDescription>
            Set your career preferences to get personalized cover letter recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Target Titles */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Target Job Titles</Label>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom title..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem('title', customTitle)}
                  className="flex-1"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => addCustomItem('title', customTitle)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TITLES.slice(0, 12).map((title) => (
                  <Badge
                    key={title}
                    variant={formData.targetTitles.includes(title) ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1 flex items-center gap-1"
                    onClick={() => togglePredefinedItem('title', title)}
                  >
                    {title}
                    {formData.targetTitles.includes(title) && (
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem('title', title);
                        }}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Salary & Company Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="salary" className="text-lg font-semibold">Minimum Salary</Label>
                <div className="flex items-center space-x-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded-md">
                  <input
                    type="checkbox"
                    id="salary-dealbreaker"
                    checked={!!formData.dealBreakers.salaryMinimum}
                    onChange={() => toggleDealBreaker('salary')}
                    className="h-3 w-3 text-orange-600"
                  />
                  <Label htmlFor="salary-dealbreaker" className="text-xs text-orange-700 font-medium">
                    Deal-breaker
                  </Label>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="180000"
                    value={formData.minimumSalary}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumSalary: e.target.value }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">/year</span>
                </div>
                {formData.dealBreakers.salaryMinimum && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Deal breaker amount: $</span>
                    <Input
                      type="number"
                      placeholder="180000"
                      value={formData.dealBreakers.salaryMinimum}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        dealBreakers: { ...prev.dealBreakers, salaryMinimum: e.target.value }
                      }))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">/year</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Company Maturity</Label>
                <div className="flex items-center space-x-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded-md">
                  <input
                    type="checkbox"
                    id="companyMaturity-dealbreaker"
                    checked={formData.dealBreakers.companyMaturity.length > 0}
                    onChange={() => toggleDealBreaker('companyMaturity')}
                    className="h-3 w-3 text-orange-600"
                  />
                  <Label htmlFor="companyMaturity-dealbreaker" className="text-xs text-orange-700 font-medium">
                    Deal-breaker
                  </Label>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'early-stage', label: 'Early-stage startup' },
                    { value: 'late-stage', label: 'Late-stage startup' },
                    { value: 'public', label: 'Public company' }
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={option.value}
                        checked={formData.companyMaturity.includes(option.value)}
                        onChange={() => togglePredefinedItem('companyMaturity', option.value)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={option.value} className="text-sm font-medium">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Work Type */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Work Type</Label>
              <div className="flex items-center space-x-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded-md">
                <input
                  type="checkbox"
                  id="workType-dealbreaker"
                  checked={formData.dealBreakers.workType.length > 0}
                  onChange={() => toggleDealBreaker('workType')}
                  className="h-3 w-3 text-orange-600"
                />
                <Label htmlFor="workType-dealbreaker" className="text-xs text-orange-700 font-medium">
                  Deal-breaker
                </Label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'in-person', label: 'In-person' }
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={option.value}
                      checked={formData.workType.includes(option.value)}
                      onChange={() => togglePredefinedItem('workType', option.value)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={option.value} className="text-sm font-medium">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Industries & Business Models */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Industries</Label>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom industry..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomItem('industry', customIndustry)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addCustomItem('industry', customIndustry)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_INDUSTRIES.slice(0, 10).map((industry) => (
                    <Badge
                      key={industry}
                      variant={formData.industries.includes(industry) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1 flex items-center gap-1"
                      onClick={() => togglePredefinedItem('industry', industry)}
                    >
                      {industry}
                      {formData.industries.includes(industry) && (
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem('industry', industry);
                          }}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Business Models</Label>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom business model..."
                    value={customBusinessModel}
                    onChange={(e) => setCustomBusinessModel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomItem('businessModel', customBusinessModel)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addCustomItem('businessModel', customBusinessModel)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_BUSINESS_MODELS.slice(0, 8).map((model) => (
                    <Badge
                      key={model}
                      variant={formData.businessModels.includes(model) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1 flex items-center gap-1"
                      onClick={() => togglePredefinedItem('businessModel', model)}
                    >
                      {model}
                      {formData.businessModels.includes(model) && (
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem('businessModel', model);
                          }}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Preferred Cities</Label>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom city..."
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem('city', customCity)}
                  className="flex-1"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => addCustomItem('city', customCity)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_CITIES.slice(0, 12).map((city) => (
                  <Badge
                    key={city}
                    variant={formData.preferredCities.includes(city) ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1 flex items-center gap-1"
                    onClick={() => togglePredefinedItem('city', city)}
                  >
                    {city}
                    {formData.preferredCities.includes(city) && (
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem('city', city);
                        }}
                      />
                    )}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="relocation"
                  checked={formData.openToRelocation}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, openToRelocation: !!checked }))}
                />
                <Label htmlFor="relocation" className="text-sm font-medium">Open to relocation</Label>
              </div>
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Goals
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
